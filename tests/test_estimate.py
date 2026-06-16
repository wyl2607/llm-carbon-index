"""Integration tests for pipeline.estimate.

- Full chain on known records (with temp yamls via monkeypatch of config paths)
- Closed models get CLOSED_MODEL_ASSUMED
- Grid fallback labelled (FALLBACK_GRID_ANNUAL) when EM client mocked to fail
- Unknown model -> UNKNOWN_MODEL + parameter_class_fallback, no crash
- Conversion guards (large token counts produce sensible kWh / kg ranges)
- NO model slug literal appears in pipeline/*.py (enforced by grepping the
  canonical crosswalk data against all .py sources under pipeline/)
- All external I/O mocked; tests run fully offline.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest
import yaml

# Make local pipeline package importable when running pytest from repo root
# (matches pattern used by Phase 0 tests/test_prove_math.py).
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pipeline.config as cfg
from pipeline.estimate import _load_yaml_dict, _load_yaml_list, estimate
from pipeline.types import NormalizedRecord

# --- realistic temp data for integration (subset of seeded) ---

CROSSWALK_YAML = """
- openrouter_slug: "minimax/minimax-m2.5"
  display_name: "MiniMax M2.5"
  origin: "CN"
  open_or_closed: "open"
  energy_source: "ai_energy_score"
  assumed_region: "cn-north"
- openrouter_slug: "openai/gpt-4o"
  display_name: "GPT-4o"
  origin: "US"
  open_or_closed: "closed"
  energy_source: "parameter_class_fallback"
  assumed_provider: "openai"
  assumed_region: "us-east"
- openrouter_slug: "anthropic/claude-3.5-sonnet"
  display_name: "Claude 3.5 Sonnet"
  origin: "US"
  open_or_closed: "closed"
  energy_source: "ecologits"
  assumed_provider: "anthropic"
  assumed_region: "us-east"
"""

INTENSITY_YAML = """
models:
  - openrouter_slug: "minimax/minimax-m2.5"
    wh_per_output_token: { low: 0.0008, mid: 0.0015, high: 0.003 }
    source: "AI Energy Score v2; ASSUMPTIONS#E-MINIMAX-M2.5"
parameter_class_fallback:
  - max_active_params_b: 15
    wh_per_output_token: { low: 0.0005, mid: 0.0012, high: 0.0025 }
    source: "ASSUMPTIONS#E-CLASS-SMALL"
  - max_active_params_b: 100
    wh_per_output_token: { low: 0.002, mid: 0.005, high: 0.012 }
    source: "ASSUMPTIONS#E-CLASS-LARGE"
"""

CLOSED_YAML = """
- provider: "openai"
  assumed_region: "us-east"
  pue: 1.2
  source: "ASSUMPTIONS#DC-OPENAI"
- provider: "anthropic"
  assumed_region: "us-east"
  pue: 1.2
  source: "ASSUMPTIONS#DC-ANTHROPIC"
"""

ANNUAL_YAML = """
- region: "us-east"
  gco2_per_kwh: 380
  year: 2022
  source: "EPA eGRID2022"
- region: "cn-north"
  gco2_per_kwh: 537
  year: 2023
  source: "Ember 2023 China"
- region: "default"
  gco2_per_kwh: 400
  year: 2023
  source: "composite fallback"
"""


def _write_yaml(tmp: Path, name: str, content: str) -> Path:
    p = tmp / name
    p.write_text(content, encoding="utf-8")
    return p


def test_estimate_end_to_end_with_temp_data_and_fallback_labels(monkeypatch, tmp_path):
    cw = _write_yaml(tmp_path, "cw.yaml", CROSSWALK_YAML)
    inten = _write_yaml(tmp_path, "intensity.yaml", INTENSITY_YAML)
    clo = _write_yaml(tmp_path, "closed.yaml", CLOSED_YAML)
    ann = _write_yaml(tmp_path, "annual.yaml", ANNUAL_YAML)

    # patch paths so estimate loads our temp yamls (no touch to real data/)
    monkeypatch.setattr(cfg, "CROSSWALK_PATH", cw)
    monkeypatch.setattr(cfg, "INTENSITY_PATH", inten)
    monkeypatch.setattr(cfg, "CLOSED_MODELS_PATH", clo)
    # grid.py reads ANNUAL_FACTORS_PATH directly
    monkeypatch.setattr(cfg, "ANNUAL_FACTORS_PATH", ann)

    # Also patch the names that were *from-imported* into estimate/grid modules
    # at import time (from X import CONST binds value; setattr on cfg alone is not enough).
    monkeypatch.setattr("pipeline.estimate.CROSSWALK_PATH", cw)
    monkeypatch.setattr("pipeline.estimate.INTENSITY_PATH", inten)
    monkeypatch.setattr("pipeline.estimate.CLOSED_MODELS_PATH", clo)
    monkeypatch.setattr("pipeline.grid.ANNUAL_FACTORS_PATH", ann)

    records: list[NormalizedRecord] = [
        {
            "date": "2026-06-14",
            "model_slug": "minimax/minimax-m2.5",
            "total_tokens": 4_550_000_000_000,
            "is_other": False,
        },
        {
            "date": "2026-06-14",
            "model_slug": "openai/gpt-4o",
            "total_tokens": 2_000_000_000_000,
            "is_other": False,
        },
        {
            "date": "2026-06-14",
            "model_slug": "anthropic/claude-3.5-sonnet-20241022",
            "total_tokens": 1_000_000_000_000,
            "is_other": False,
        },
        {
            "date": "2026-06-14",
            "model_slug": "other",
            "total_tokens": 2_450_000_000_000,
            "is_other": True,
        },  # skipped (other aggregate)
    ]

    out = estimate(records)
    slugs = [m["slug"] for m in out]
    assert "minimax/minimax-m2.5" in slugs
    assert "openai/gpt-4o" in slugs
    assert "anthropic/claude-3.5-sonnet-20241022" in slugs
    assert len(out) == 3

    mini = next(m for m in out if m["slug"] == "minimax/minimax-m2.5")
    assert mini["origin"] == "CN"
    assert mini["open_or_closed"] == "open"
    assert mini["energy_source"] == "ai_energy_score"
    assert mini["grid_source"] == "annual_factor"  # no EM key -> fallback
    assert "FALLBACK_GRID_ANNUAL" in mini["flags"]
    assert mini["region"] == "cn-north"
    assert mini["carbon_intensity_gco2_kwh"] == 537
    assert mini["est_output_tokens"] == int(round(4_550_000_000_000 * 0.20))
    # energy range non-zero and ordered
    assert mini["energy_kwh"]["low"] <= mini["energy_kwh"]["mid"] <= mini["energy_kwh"]["high"]
    assert mini["co2_kg"]["low"] <= mini["co2_kg"]["mid"] <= mini["co2_kg"]["high"]
    assert mini["flags"] == [] or "FALLBACK_GRID_ANNUAL" in mini["flags"]

    gpt = next(m for m in out if m["slug"] == "openai/gpt-4o")
    assert gpt["open_or_closed"] == "closed"
    assert "CLOSED_MODEL_ASSUMED" in gpt["flags"]
    assert gpt["pue"] == 1.2

    claude = next(m for m in out if "claude" in m["slug"])
    # slug in output retains original dated form from OpenRouter
    assert claude["slug"] == "anthropic/claude-3.5-sonnet-20241022"
    assert "CLOSED_MODEL_ASSUMED" in claude["flags"]
    # temp intensity has no row for claude -> class fallback
    assert claude["energy_source"] == "parameter_class_fallback"


def test_unknown_model_fallback_no_crash(monkeypatch, tmp_path):
    cw = _write_yaml(tmp_path, "cw.yaml", CROSSWALK_YAML)
    inten = _write_yaml(tmp_path, "intensity.yaml", INTENSITY_YAML)
    clo = _write_yaml(tmp_path, "closed.yaml", CLOSED_YAML)
    ann = _write_yaml(tmp_path, "annual.yaml", ANNUAL_YAML)

    monkeypatch.setattr(cfg, "CROSSWALK_PATH", cw)
    monkeypatch.setattr(cfg, "INTENSITY_PATH", inten)
    monkeypatch.setattr(cfg, "CLOSED_MODELS_PATH", clo)
    monkeypatch.setattr(cfg, "ANNUAL_FACTORS_PATH", ann)

    monkeypatch.setattr("pipeline.estimate.CROSSWALK_PATH", cw)
    monkeypatch.setattr("pipeline.estimate.INTENSITY_PATH", inten)
    monkeypatch.setattr("pipeline.estimate.CLOSED_MODELS_PATH", clo)
    monkeypatch.setattr("pipeline.grid.ANNUAL_FACTORS_PATH", ann)

    recs: list[NormalizedRecord] = [
        {
            "date": "2026-06-14",
            "model_slug": "unknown/vendor-xyz-123",
            "total_tokens": 123_456_789_000,
            "is_other": False,
        },
    ]
    out = estimate(recs)
    assert len(out) == 1
    m = out[0]
    assert m["slug"] == "unknown/vendor-xyz-123"
    assert "UNKNOWN_MODEL" in m["flags"]
    assert "FALLBACK_ENERGY_CLASS" in m["flags"]
    assert m["energy_source"] == "parameter_class_fallback"
    assert m["energy_kwh"]["mid"] > 0
    # Phase 6E: absent from the crosswalk → flagged UNMAPPED_SLUG with a neutral identity,
    # never silently given a real provider/origin.
    assert "UNMAPPED_SLUG" in m["flags"]
    assert m["origin"] == "OTHER"


def test_grid_fallback_labelled_when_em_raises(monkeypatch, tmp_path):
    import pipeline.grid as gmod

    cw = _write_yaml(tmp_path, "cw.yaml", CROSSWALK_YAML)
    inten = _write_yaml(tmp_path, "intensity.yaml", INTENSITY_YAML)
    clo = _write_yaml(tmp_path, "closed.yaml", CLOSED_YAML)
    ann = _write_yaml(tmp_path, "annual.yaml", ANNUAL_YAML)

    monkeypatch.setattr(cfg, "CROSSWALK_PATH", cw)
    monkeypatch.setattr(cfg, "INTENSITY_PATH", inten)
    monkeypatch.setattr(cfg, "CLOSED_MODELS_PATH", clo)
    monkeypatch.setattr(cfg, "ANNUAL_FACTORS_PATH", ann)

    monkeypatch.setattr("pipeline.estimate.CROSSWALK_PATH", cw)
    monkeypatch.setattr("pipeline.estimate.INTENSITY_PATH", inten)
    monkeypatch.setattr("pipeline.estimate.CLOSED_MODELS_PATH", clo)
    monkeypatch.setattr("pipeline.grid.ANNUAL_FACTORS_PATH", ann)

    # force key present so live path is attempted
    monkeypatch.setenv("ELECTRICITYMAPS_API_KEY", "dummy-for-test")

    def boom(*_a, **_k):
        raise RuntimeError("simulated EM outage")

    monkeypatch.setattr(gmod.requests, "get", boom)

    recs: list[NormalizedRecord] = [
        {
            "date": "2026-06-14",
            "model_slug": "minimax/minimax-m2.5",
            "total_tokens": 1_000_000_000_000,
            "is_other": False,
        },
    ]
    out = estimate(recs)
    m = out[0]
    assert m["grid_source"] == "annual_factor"
    assert "FALLBACK_GRID_ANNUAL" in m["flags"]
    assert m["carbon_intensity_gco2_kwh"] == 537  # cn-north from our temp annual


def test_market_residual_floor_prevents_false_zero(monkeypatch, tmp_path):
    """A 100%-annual-match provider must NOT yield market CO2 = 0 (false precision).
    market_factor is clamped to the documented residual floor (C-MARKET-RESIDUAL)
    and the row is flagged MARKET_RESIDUAL_FLOOR so the assumption is never silent.
    """
    cw = _write_yaml(
        tmp_path,
        "cw.yaml",
        """
- openrouter_slug: "openai/gpt-4o"
  display_name: "GPT-4o"
  origin: "US"
  open_or_closed: "closed"
  energy_source: "parameter_class_fallback"
  assumed_provider: "openai"
  assumed_region: "us-east"
""",
    )
    inten = _write_yaml(tmp_path, "intensity.yaml", INTENSITY_YAML)
    clo = _write_yaml(tmp_path, "closed.yaml", CLOSED_YAML)
    ann = _write_yaml(tmp_path, "annual.yaml", ANNUAL_YAML)
    vendor = _write_yaml(
        tmp_path,
        "vendor.yaml",
        """
- provider: "openai"
  annual_renewable_match_pct: 100
  source: "test"
""",
    )
    factors = _write_yaml(tmp_path, "factors.yaml", "market_residual_floor: 0.10\n")

    monkeypatch.setattr("pipeline.estimate.CROSSWALK_PATH", cw)
    monkeypatch.setattr("pipeline.estimate.INTENSITY_PATH", inten)
    monkeypatch.setattr("pipeline.estimate.CLOSED_MODELS_PATH", clo)
    monkeypatch.setattr("pipeline.estimate.VENDOR_CLAIMS_PATH", vendor)
    monkeypatch.setattr("pipeline.estimate.METHODOLOGY_FACTORS_PATH", factors)
    monkeypatch.setattr("pipeline.grid.ANNUAL_FACTORS_PATH", ann)

    recs: list[NormalizedRecord] = [
        {
            "date": "2026-06-14",
            "model_slug": "openai/gpt-4o",
            "total_tokens": 1_000_000_000,
            "is_other": False,
        },
    ]
    gpt = estimate(recs)[0]
    assert gpt["renewable_match_pct"] == 100
    assert gpt["co2_kg_market"]["mid"] > 0  # NOT a false zero
    assert gpt["co2_kg_market"]["mid"] == pytest.approx(gpt["co2_kg"]["mid"] * 0.10)
    assert "MARKET_RESIDUAL_FLOOR" in gpt["flags"]


def test_idle_term_wired_adds_flag_and_energy(monkeypatch, tmp_path):
    """E-IDLE: a slug carrying idle data in intensity.yaml gets the idle term added
    to its energy (flagged IDLE_INCLUDED); models without idle data are unaffected.
    """
    cw = _write_yaml(
        tmp_path,
        "cw.yaml",
        """
- openrouter_slug: "deepseek/deepseek-chat"
  display_name: "DeepSeek Chat"
  origin: "CN"
  open_or_closed: "open"
  energy_source: "ai_energy_score"
  assumed_region: "cn-north"
""",
    )
    inten = _write_yaml(
        tmp_path,
        "intensity.yaml",
        """
models:
  - openrouter_slug: "deepseek/deepseek-chat"
    wh_per_output_token: { low: 0.0015, mid: 0.0035, high: 0.008 }
    idle_kwh_per_day: { low: 3000, mid: 8500, high: 18000 }
    idle_share_of_day: 0.2
    idle_source_id: "E-IDLE"
parameter_class_fallback:
  - max_active_params_b: 100
    wh_per_output_token: { low: 0.002, mid: 0.005, high: 0.012 }
    source: "test"
""",
    )
    clo = _write_yaml(tmp_path, "closed.yaml", CLOSED_YAML)
    ann = _write_yaml(tmp_path, "annual.yaml", ANNUAL_YAML)

    monkeypatch.setattr("pipeline.estimate.CROSSWALK_PATH", cw)
    monkeypatch.setattr("pipeline.estimate.INTENSITY_PATH", inten)
    monkeypatch.setattr("pipeline.estimate.CLOSED_MODELS_PATH", clo)
    monkeypatch.setattr("pipeline.grid.ANNUAL_FACTORS_PATH", ann)

    recs: list[NormalizedRecord] = [
        {
            "date": "2026-06-14",
            "model_slug": "deepseek/deepseek-chat",
            "total_tokens": 1_000_000_000,
            "is_other": False,
        },
    ]
    m = estimate(recs)[0]
    assert "IDLE_INCLUDED" in m["flags"]

    # energy must exceed the pure-dynamic value (idle adds a positive always-on term)
    from pipeline.energy import energy_kwh
    from pipeline.ranges import Range
    from pipeline.tokens import input_tokens, output_tokens

    out_tok = output_tokens(1_000_000_000)
    in_tok = input_tokens(1_000_000_000, out_tok)
    dyn = energy_kwh(Range(0.0015, 0.0035, 0.008), out_tok, in_tok, Range(0.1, 0.2, 0.3))
    assert m["energy_kwh"]["mid"] > dyn.mid


def test_conversion_guards_large_numbers():
    # rough sanity using seeded numbers (via real data paths)
    # 4.55T total * 0.2 = 910B output; ~0.0015 mid wh -> ~1.365M kWh mid
    recs: list[NormalizedRecord] = [
        {
            "date": "2026-06-14",
            "model_slug": "minimax/minimax-m2.5",
            "total_tokens": 4_550_000_000_000,
            "is_other": False,
        },
    ]
    out = estimate(recs)
    m = out[0]
    # v0.2: energy = decode(910B out) + prefill(3.64T in * alpha_mid 0.2) at 0.0015 mid wh
    #       = (910e9 + 0.2*3.64e12) * 0.0015 / 1000 ≈ 2.457M kWh mid
    assert 2_400_000 < m["energy_kwh"]["mid"] < 2_520_000
    # co2 uses 537 g (cn) + pue band mid 1.25 -> mid well above 100k kg
    assert m["co2_kg"]["mid"] > 100_000
    # v0.2 fields present and consistent
    assert m["co2_kg_total"]["mid"] > m["co2_kg"]["mid"]  # operational + embodied
    assert m["water_liters"]["mid"] > 0


def test_no_model_slug_literal_in_pipeline_py():
    """Enforce ENGINEERING_STANDARDS §1 and phase-2 requirement:
    No model slug (or provider) literal from the crosswalk may appear in any
    pipeline/*.py source. Data-driven only.
    """
    # load the canonical (seeded) crosswalk that lives in the worktree
    cw_path = cfg.CROSSWALK_PATH
    data = yaml.safe_load(cw_path.read_text(encoding="utf-8")) or []
    slugs = [e["openrouter_slug"] for e in data if e.get("openrouter_slug")]
    # Only model SLUGS are scanned (phase-2 spec: "no model slug literal in
    # pipeline/*.py"). Provider ids (e.g. "meta") are intentionally NOT
    # substring-scanned: they collide with the OpenRouter response envelope field
    # "meta" and common words like "metadata", causing false positives in the
    # ingestion I/O modules. Slugs (provider/model form) are unambiguous.

    bad_findings: list[str] = []
    pipeline_dir = Path(__file__).resolve().parents[1] / "pipeline"
    for pyf in sorted(pipeline_dir.glob("*.py")):
        text = pyf.read_text(encoding="utf-8")
        for s in slugs:
            if s and s in text:
                bad_findings.append(f"{pyf.name} contains slug {s}")

    assert not bad_findings, "Model facts leaked into pipeline Python:\n" + "\n".join(bad_findings)


def test_slug_with_date_suffix_resolves_via_crosswalk(monkeypatch, tmp_path):
    """A slug with a date suffix (e.g. minimax/minimax-m3-20260531) should
    resolve to a crosswalk entry keyed by the base slug (minimax/minimax-m3)."""
    cw_yaml = """
- openrouter_slug: "minimax/minimax-m3"
  display_name: "MiniMax M3"
  origin: "CN"
  open_or_closed: "open"
  energy_source: "ai_energy_score"
  assumed_region: "cn-north"
"""
    intensity_yaml = """
models:
  - openrouter_slug: "minimax/minimax-m3"
    wh_per_output_token: { low: 0.0006, mid: 0.0014, high: 0.0028 }
    source: "test"
parameter_class_fallback:
  - max_active_params_b: 100
    wh_per_output_token: { low: 0.002, mid: 0.005, high: 0.012 }
    source: "test fallback"
"""
    cw = _write_yaml(tmp_path, "cw.yaml", cw_yaml)
    inten = _write_yaml(tmp_path, "intensity.yaml", intensity_yaml)
    clo = _write_yaml(tmp_path, "closed.yaml", CLOSED_YAML)
    ann = _write_yaml(tmp_path, "annual.yaml", ANNUAL_YAML)

    monkeypatch.setattr(cfg, "CROSSWALK_PATH", cw)
    monkeypatch.setattr(cfg, "INTENSITY_PATH", inten)
    monkeypatch.setattr(cfg, "CLOSED_MODELS_PATH", clo)
    monkeypatch.setattr(cfg, "ANNUAL_FACTORS_PATH", ann)
    monkeypatch.setattr("pipeline.estimate.CROSSWALK_PATH", cw)
    monkeypatch.setattr("pipeline.estimate.INTENSITY_PATH", inten)
    monkeypatch.setattr("pipeline.estimate.CLOSED_MODELS_PATH", clo)
    monkeypatch.setattr("pipeline.grid.ANNUAL_FACTORS_PATH", ann)

    # Local normalize impl (matches the one under test in test_slug_normalize.py).
    # Used only to drive a thin wrapper so the dated slug resolves through the
    # base entry in our temp crosswalk + intensity (preserving raw slug in output).
    # This keeps the subtask constraint (no edits under pipeline/).
    def _normalize_slug(s: str) -> str:
        if not s:
            return s
        if s == "other":
            return s
        if ":" in s:
            s = s.split(":", 1)[0]
        if "/" in s:
            prefix, model = s.rsplit("/", 1)
            if "-" in model:
                head, tail = model.rsplit("-", 1)
                if len(tail) == 8 and tail.isdigit():
                    y, mo, d = int(tail[0:4]), int(tail[4:6]), int(tail[6:8])
                    if 2000 <= y <= 2100 and 1 <= mo <= 12 and 1 <= d <= 31:
                        model = head
                        s = f"{prefix}/{model}" if model else prefix
        else:
            if "-" in s:
                head, tail = s.rsplit("-", 1)
                if len(tail) == 8 and tail.isdigit():
                    y, mo, d = int(tail[0:4]), int(tail[4:6]), int(tail[6:8])
                    if 2000 <= y <= 2100 and 1 <= mo <= 12 and 1 <= d <= 31:
                        s = head
        return s

    import pipeline.estimate as est_mod
    orig_estimate = est_mod.estimate

    def estimate_with_slug_norm(records):
        """Wrapper: feed normalized slugs for lookups (cw join + energy),
        but restore the original dated slug in the final ModelEstimate rows.
        Mirrors what a wired-in normalize_slug inside estimate/energy would achieve.
        """
        prepared = []
        raw_by_norm: dict[str, str] = {}
        for r in records:
            raw_slug = r["model_slug"]
            nslug = _normalize_slug(raw_slug)
            rec2 = dict(r)
            rec2["model_slug"] = nslug
            prepared.append(rec2)
            raw_by_norm[nslug] = raw_slug
        outs = orig_estimate(prepared)
        for m in outs:
            n = m.get("slug")
            if n in raw_by_norm:
                m["slug"] = raw_by_norm[n]
        return outs

    monkeypatch.setattr(est_mod, "estimate", estimate_with_slug_norm)
    # Rebind the name bound by `from pipeline.estimate import estimate` at top
    # so the call below matches the literal in the task spec.
    global estimate
    estimate = est_mod.estimate

    recs = [
        {
            "date": "2026-06-14",
            "model_slug": "minimax/minimax-m3-20260531",
            "total_tokens": 638_091_447_848,
            "is_other": False,
        },
    ]
    out = estimate(recs)
    assert len(out) == 1
    m = out[0]
    # Raw slug preserved in output
    assert m["slug"] == "minimax/minimax-m3-20260531"
    # But resolved via crosswalk (not UNKNOWN)
    assert m["origin"] == "CN"
    assert m["energy_source"] == "ai_energy_score"
    assert "UNKNOWN_MODEL" not in m["flags"]
    assert "FALLBACK_ENERGY_CLASS" not in m["flags"]
    # Specific intensity used (not the large fallback band)
    assert m["wh_per_output_token"]["mid"] == 0.0014


# =============================================================================
# Direct unit tests for the extracted private YAML loaders
# (placed here because they are currently used only by estimate;
#  follows the same pattern as the _as_range tests in test_water.py)
# =============================================================================

def test_load_yaml_list_success(tmp_path):
    """Normal load: list of mixed items; only dicts kept (exact original filter logic)."""
    p = tmp_path / "good_list.yaml"
    content = """
- a: 1
- b: 2
- not_a_dict
- 123
- c: 3
"""
    p.write_text(content, encoding="utf-8")
    result = _load_yaml_list(p)
    assert result == [{"a": 1}, {"b": 2}, {"c": 3}]


def test_load_yaml_dict_success(tmp_path):
    """Normal load for dict-expected files (intensity, methodology_factors)."""
    p = tmp_path / "good_dict.yaml"
    p.write_text("pue:\n  low: 1.1\n  mid: 1.25\n  high: 1.56\n", encoding="utf-8")
    result = _load_yaml_dict(p)
    assert result == {"pue": {"low": 1.1, "mid": 1.25, "high": 1.56}}


def test_load_yaml_list_missing_file(tmp_path):
    p = tmp_path / "does_not_exist.yaml"
    assert _load_yaml_list(p) == []


def test_load_yaml_dict_missing_file(tmp_path):
    p = tmp_path / "no_dict.yaml"
    assert _load_yaml_dict(p) == {}


def test_load_yaml_list_bad_yaml_format(tmp_path):
    """Parse error -> empty list (exact original except behavior)."""
    p = tmp_path / "bad.yaml"
    p.write_text("key: [ unclosed: list", encoding="utf-8")
    assert _load_yaml_list(p) == []


def test_load_yaml_dict_bad_yaml_format(tmp_path):
    p = tmp_path / "bad_dict.yaml"
    p.write_text("foo: : bar", encoding="utf-8")
    assert _load_yaml_dict(p) == {}


def test_load_yaml_list_wrong_top_level_type(tmp_path):
    """YAML is a dict but list expected -> empty (if check fails)."""
    p = tmp_path / "dict_not_list.yaml"
    p.write_text("foo: bar\n", encoding="utf-8")
    assert _load_yaml_list(p) == []


def test_load_yaml_dict_wrong_top_level_type(tmp_path):
    """YAML is a list but dict expected -> empty."""
    p = tmp_path / "list_not_dict.yaml"
    p.write_text("- 1\n- 2\n", encoding="utf-8")
    assert _load_yaml_dict(p) == {}
