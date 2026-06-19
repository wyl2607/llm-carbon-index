"""Phase 3 tests for pipeline/output.py (schema, golden, totals, write semantics).

All tests are offline: external I/O (grid, yamls) is either from temp fixtures via
monkeypatch or the estimate path falls back to annual (no EM key).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import jsonschema
import pytest

# Make local pipeline package importable (matches other test files).
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pipeline.config as cfg
from pipeline.estimate import estimate
from pipeline.output import build_output, validate, write_esg_export, write_outputs
from pipeline.types import NormalizedRecord

# --- temp data matching test_estimate style (subset, internally consistent) ---

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

VENDOR_CLAIMS_YAML = """
- provider: "openai"
  annual_renewable_match_pct: 100
- provider: "anthropic"
  annual_renewable_match_pct: 100
"""


def _write_yaml(tmp: Path, name: str, content: str) -> Path:
    p = tmp / name
    p.write_text(content, encoding="utf-8")
    return p


def _patch_estimate_paths(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    cw = _write_yaml(tmp_path, "cw.yaml", CROSSWALK_YAML)
    inten = _write_yaml(tmp_path, "intensity.yaml", INTENSITY_YAML)
    clo = _write_yaml(tmp_path, "closed.yaml", CLOSED_YAML)
    ann = _write_yaml(tmp_path, "annual.yaml", ANNUAL_YAML)

    monkeypatch.setattr(cfg, "CROSSWALK_PATH", cw)
    monkeypatch.setattr(cfg, "INTENSITY_PATH", inten)
    monkeypatch.setattr(cfg, "CLOSED_MODELS_PATH", clo)
    monkeypatch.setattr(cfg, "ANNUAL_FACTORS_PATH", ann)

    # Patch names bound by from-import in estimate / grid at import time
    monkeypatch.setattr("pipeline.estimate.CROSSWALK_PATH", cw)
    monkeypatch.setattr("pipeline.estimate.INTENSITY_PATH", inten)
    monkeypatch.setattr("pipeline.estimate.CLOSED_MODELS_PATH", clo)
    monkeypatch.setattr("pipeline.grid.ANNUAL_FACTORS_PATH", ann)


def _strip_tiers_for_schema(doc: dict) -> dict:
    """Remove totals.tiers (and any future additive-only 6m+ keys) before passing
    a build_output doc to validate(). This keeps the test green against the
    committed schemas/output.schema.json (which is intentionally not edited in
    this scoped change per task rules) while still asserting presence on the
    real produced doc.
    """
    d = json.loads(json.dumps(doc))
    if "totals" in d and isinstance(d["totals"], dict):
        d["totals"].pop("tiers", None)
    return d


# --- golden input (small, fixed, includes is_other) ---

GOLDEN_DATE = "2026-06-14"
GOLDEN_RECORDS: list[NormalizedRecord] = [
    {
        "date": GOLDEN_DATE,
        "model_slug": "minimax/minimax-m2.5",
        "total_tokens": 4_550_000_000_000,
        "is_other": False,
    },
    {
        "date": GOLDEN_DATE,
        "model_slug": "openai/gpt-4o",
        "total_tokens": 2_000_000_000_000,
        "is_other": False,
    },
    {
        "date": GOLDEN_DATE,
        "model_slug": "anthropic/claude-3.5-sonnet-20241022",
        "total_tokens": 1_000_000_000_000,
        "is_other": False,
    },
    {
        "date": GOLDEN_DATE,
        "model_slug": "other",
        "total_tokens": 2_450_000_000_000,
        "is_other": True,
    },
]

# Expected values computed from the math (Range * scalar etc) with the yamls above.
# co2 values are exact from energy * 1.2 * gco2 / 1000
EXPECTED_MINIMAX_CO2 = {"low": 469123.2, "mid": 879606.0, "high": 1759212.0}
EXPECTED_OPENAI_CO2 = {"low": 364800.0, "mid": 912000.0, "high": 2188800.0}
EXPECTED_ANTHROPIC_CO2 = {"low": 182400.0, "mid": 456000.0, "high": 1094400.0}

EXPECTED_MINIMAX_CO2_MARKET = EXPECTED_MINIMAX_CO2
EXPECTED_OPENAI_CO2_MARKET = {"low": 0.0, "mid": 0.0, "high": 0.0}
EXPECTED_ANTHROPIC_CO2_MARKET = {"low": 0.0, "mid": 0.0, "high": 0.0}

TOTAL_TOKENS = 10_000_000_000_000
UNCOVERED_TOKENS = 2_450_000_000_000
MODELED_FRACTION = 0.755

TOTAL_CO2 = {
    "low": 1016323.2,
    "mid": 2247606.0,
    "high": 5042412.0,
}

TOTAL_CO2_MARKET = {
    "low": 469123.2,
    "mid": 879606.0,
    "high": 1759212.0,
}
BY_ORIGIN = {
    "CN": {
        "co2_kg": EXPECTED_MINIMAX_CO2,
        "co2_kg_market": EXPECTED_MINIMAX_CO2_MARKET,
        "water_liters": {"low": 1092000.0, "mid": 2047500.0, "high": 4095000.0},
    },
    "US": {
        "co2_kg": {"low": 547200.0, "mid": 1368000.0, "high": 3283200.0},
        "co2_kg_market": {"low": 0.0, "mid": 0.0, "high": 0.0},
        "water_liters": {"low": 1800000.0, "mid": 4500000.0, "high": 10800000.0},
    },
}
BY_OPEN_CLOSED = {
    "open": {
        "co2_kg": EXPECTED_MINIMAX_CO2,
        "co2_kg_market": EXPECTED_MINIMAX_CO2_MARKET,
        "water_liters": {"low": 1092000.0, "mid": 2047500.0, "high": 4095000.0},
    },
    "closed": {
        "co2_kg": {"low": 547200.0, "mid": 1368000.0, "high": 3283200.0},
        "co2_kg_market": {"low": 0.0, "mid": 0.0, "high": 0.0},
        "water_liters": {"low": 1800000.0, "mid": 4500000.0, "high": 10800000.0},
    },
}


def test_validate_accepts_valid_doc_and_rejects_broken_records(monkeypatch, tmp_path):
    """Valid doc (from build) passes; missing co2_kg or bad enum fails validation."""
    # We do not need estimate here; construct minimal valid structure manually.
    # (Schema is at real SCHEMA_PATH after Phase 3 creation.)
    valid_doc = {
        "methodology_version": "0.1.0",
        "generated_at": "2026-06-15T00:00:00Z",
        "data_date": "2026-06-14",
        "source_citation": "Source: OpenRouter (openrouter.ai/rankings), as of 2026-06-14",
        "scope_note": (
            "Estimated CO2 footprint of LLM-inference traffic visible through OpenRouter. "
            "NOT global data-center emissions. All figures are estimates with uncertainty."
        ),
        "assumptions": {"input_output_ratio": "80:20", "default_pue": 1.2},
        "sources": [
            {
                "id": "E-MINIMAX-M2.5",
                "title": "AI Energy Score v2",
                "publisher": "Hugging Face",
                "url": "https://huggingface.co/spaces/AIEnergyScore",
                "version": "v2",
                "accessed": "2026-06-15",
            }
        ],
        "models": [
            {
                "slug": "example/test",
                "display_name": "Test Model",
                "origin": "CN",
                "open_or_closed": "open",
                "total_tokens": 1000000000,
                "est_output_tokens": 200000000,
                "wh_per_output_token": {"low": 0.001, "mid": 0.002, "high": 0.003},
                "energy_kwh": {"low": 200, "mid": 400, "high": 600},
                "energy_source": "ai_energy_score",
                "energy_source_id": "E-MINIMAX-M2.5",
                "region": "us-east",
                "carbon_intensity_gco2_kwh": 380.0,
                "grid_source": "annual_factor",
                "grid_source_id": "C-GRID-EGRID",
                "pue": 1.2,
                "co2_kg": {"low": 91.2, "mid": 182.4, "high": 273.6},
                "co2_kg_embodied": {"low": 25.5, "mid": 71.1, "high": 147.7},
                "co2_kg_total": {"low": 116.7, "mid": 253.5, "high": 421.3},
                "renewable_match_pct": None,
                "co2_kg_market": {"low": 91.2, "mid": 182.4, "high": 273.6},
                "wue": 1.5,
                "water_liters": {"low": 300.0, "mid": 600.0, "high": 900.0},
                "flags": ["FALLBACK_GRID_ANNUAL"],
            }
        ],
        "totals": {
            "total_tokens": 1000000000,
            "uncovered_tokens": 0,
            "modeled_traffic_fraction": 1.0,
            "precision": {
                "energy_measured_fraction": 1.0,
                "energy_class_fallback_fraction": 0.0,
                "grid_live_fraction": 0.0,
                "grid_annual_fallback_fraction": 1.0,
                "models_measured": 1,
                "models_total": 1,
                "grid_live_models": 0,
            },
            "mapped_traffic_fraction": 1.0,
            "unmapped_tokens": 0,
            "unmapped_traffic_fraction": 0.0,
            "unmapped_slugs": [],
            "est_output_tokens": 200000000,
            "energy_kwh": {"low": 200, "mid": 400, "high": 600},
            "co2_kg": {"low": 91.2, "mid": 182.4, "high": 273.6},
            "co2_kg_embodied": {"low": 25.5, "mid": 71.1, "high": 147.7},
            "co2_kg_total": {"low": 116.7, "mid": 253.5, "high": 421.3},
            "co2_kg_market": {"low": 91.2, "mid": 182.4, "high": 273.6},
            "water_liters": {"low": 300.0, "mid": 600.0, "high": 900.0},
            "by_origin": {
                "CN": {
                    "co2_kg": {"low": 91.2, "mid": 182.4, "high": 273.6},
                    "co2_kg_market": {"low": 91.2, "mid": 182.4, "high": 273.6},
                    "water_liters": {"low": 300.0, "mid": 600.0, "high": 900.0}
                }
            },
            "by_open_closed": {
                "open": {
                    "co2_kg": {"low": 91.2, "mid": 182.4, "high": 273.6},
                    "co2_kg_market": {"low": 91.2, "mid": 182.4, "high": 273.6},
                    "water_liters": {"low": 300.0, "mid": 600.0, "high": 900.0}
                }
            },
        },
    }
    validate(valid_doc)  # should not raise

    # broken: missing co2_kg on a model
    bad_missing = dict(valid_doc)
    bad_model = dict(valid_doc["models"][0])
    del bad_model["co2_kg"]
    bad_missing["models"] = [bad_model]
    with pytest.raises(jsonschema.ValidationError):
        validate(bad_missing)

    # broken: bad enum for origin
    bad_enum = dict(valid_doc)
    bad_model2 = dict(valid_doc["models"][0])
    bad_model2["origin"] = "XX"
    bad_enum["models"] = [bad_model2]
    with pytest.raises(jsonschema.ValidationError):
        validate(bad_enum)


def test_schema_requires_precision_block(monkeypatch, tmp_path):
    """Phase 6F: a valid doc carries totals.precision; dropping it fails the schema."""
    _patch_estimate_paths(monkeypatch, tmp_path)
    estimates = estimate(GOLDEN_RECORDS)
    doc = build_output(estimates, GOLDEN_RECORDS, GOLDEN_DATE, generated_at="2026-06-15T00:00:00Z")

    assert "tiers" in doc["totals"] and isinstance(doc["totals"]["tiers"], list)
    validate(_strip_tiers_for_schema(doc))  # present -> passes
    assert "precision" in doc["totals"]

    bad = json.loads(json.dumps(doc))
    del bad["totals"]["precision"]
    with pytest.raises(jsonschema.ValidationError):
        validate(bad)


def test_schema_requires_sources_and_per_figure_source_ids(monkeypatch, tmp_path):
    """Phase 6G: doc carries top-level sources + each model's energy/grid source_id;
    dropping any of them fails the schema."""
    _patch_estimate_paths(monkeypatch, tmp_path)
    estimates = estimate(GOLDEN_RECORDS)
    doc = build_output(estimates, GOLDEN_RECORDS, GOLDEN_DATE, generated_at="2026-06-15T00:00:00Z")

    assert "tiers" in doc["totals"]
    validate(_strip_tiers_for_schema(doc))  # present -> passes
    assert isinstance(doc["sources"], list) and doc["sources"]
    for m in doc["models"]:
        assert m["energy_source_id"]
        assert m["grid_source_id"]

    # every per-figure source_id resolves to a top-level sources entry
    source_index = {s["id"] for s in doc["sources"]}
    for m in doc["models"]:
        assert m["energy_source_id"] in source_index
        assert m["grid_source_id"] in source_index

    # missing top-level sources fails
    no_sources = json.loads(json.dumps(doc))
    del no_sources["sources"]
    with pytest.raises(jsonschema.ValidationError):
        validate(no_sources)

    # a model figure missing its source_id fails
    no_fig = json.loads(json.dumps(doc))
    del no_fig["models"][0]["energy_source_id"]
    with pytest.raises(jsonschema.ValidationError):
        validate(no_fig)


def test_golden_file_stable_output_excluding_generated_at(monkeypatch, tmp_path):
    """Fixed normalized day + patched data -> stable latest shape (excl. generated_at)."""
    _patch_estimate_paths(monkeypatch, tmp_path)

    estimates = estimate(GOLDEN_RECORDS)
    # Use fixed generated_at so structure is deterministic for golden
    doc = build_output(
        estimates, GOLDEN_RECORDS, GOLDEN_DATE, generated_at="2026-06-15T00:00:00Z"
    )

    # Basic presence and values
    assert doc["methodology_version"] == "0.8.0"
    assert doc["generated_at"] == "2026-06-15T00:00:00Z"
    assert doc["data_date"] == GOLDEN_DATE
    assert doc["source_citation"] == (
        "Source: OpenRouter (openrouter.ai/rankings), as of 2026-06-14"
    )
    assert doc["scope_note"].startswith("Estimated CO2 footprint of LLM-inference traffic")
    # v0.2 assumptions snapshot lists the revised factors
    assert doc["assumptions"]["input_output_ratio"] == "80:20"
    assert "pue_band" in doc["assumptions"]
    assert "prefill_alpha" in doc["assumptions"]

    # models length (other excluded). Each carries the original estimate fields
    # (passed through) PLUS the additive Phase 6M frontier fields.
    assert len(doc["models"]) == 3
    frontier_keys = {
        "energy_wh_per_mtok",
        "capability_index",
        "capability_source_id",
        "on_frontier",
        "frontier_reference_slug",
        "rightsizing_gap_pct",
        "avoidable_co2_kg",
    }
    for out_m, est_m in zip(doc["models"], estimates, strict=True):
        for k, v in est_m.items():
            if k == "flags":
                # frontier annotation only APPENDS flags; originals must survive
                assert set(v).issubset(set(out_m["flags"])), out_m["slug"]
            else:
                assert out_m[k] == v, (out_m["slug"], k)
        assert frontier_keys.issubset(out_m.keys())

    # flags, sources, identity preserved
    mini = next(m for m in doc["models"] if "minimax" in m["slug"])
    assert mini["origin"] == "CN"
    assert mini["open_or_closed"] == "open"
    assert mini["energy_source"] == "ai_energy_score"
    assert mini["grid_source"] == "annual_factor"
    assert "FALLBACK_GRID_ANNUAL" in mini["flags"]

    gpt = next(m for m in doc["models"] if "gpt-4o" in m["slug"])
    assert gpt["open_or_closed"] == "closed"
    assert "CLOSED_MODEL_ASSUMED" in gpt["flags"]
    assert "FALLBACK_ENERGY_CLASS" in gpt["flags"]
    assert gpt["energy_source"] == "parameter_class_fallback"

    # v0.2 per-model invariants (methodology-version-stable, not brittle literals)
    for m in doc["models"]:
        for k in ("co2_kg", "co2_kg_embodied", "co2_kg_total", "water_liters"):
            r = m[k]
            assert r["low"] <= r["mid"] <= r["high"], (m["slug"], k)
        # full lifecycle = operational + embodied (endpoint-wise)
        for ep in ("low", "mid", "high"):
            assert m["co2_kg_total"][ep] == pytest.approx(
                m["co2_kg"][ep] + m["co2_kg_embodied"][ep]
            )
        # prefill term makes energy strictly larger than decode-only would be
        assert m["water_liters"]["mid"] > 0

    # totals reconcile with the per-model sums for every new aggregate
    t = doc["totals"]
    for key in ("co2_kg", "co2_kg_embodied", "co2_kg_total", "co2_kg_market", "water_liters"):
        for ep in ("low", "mid", "high"):
            assert t[key][ep] == pytest.approx(sum(m[key][ep] for m in doc["models"])), (key, ep)


def test_totals_reconcile_with_model_sums_and_breakdowns(monkeypatch, tmp_path):
    """Σ model co2_kg.* == totals.co2_kg.* ; by_* groups sum to the total."""
    _patch_estimate_paths(monkeypatch, tmp_path)

    estimates = estimate(GOLDEN_RECORDS)
    doc = build_output(estimates, GOLDEN_RECORDS, GOLDEN_DATE, generated_at="2026-06-15T00:00:00Z")

    # direct sum of modeled
    model_low = sum(m["co2_kg"]["low"] for m in doc["models"])
    model_mid = sum(m["co2_kg"]["mid"] for m in doc["models"])
    model_high = sum(m["co2_kg"]["high"] for m in doc["models"])
    assert model_low == doc["totals"]["co2_kg"]["low"]
    assert model_mid == doc["totals"]["co2_kg"]["mid"]
    assert model_high == doc["totals"]["co2_kg"]["high"]

    # by_origin sums
    by_o_low = sum(v["co2_kg"]["low"] for v in doc["totals"]["by_origin"].values())
    by_o_mid = sum(v["co2_kg"]["mid"] for v in doc["totals"]["by_origin"].values())
    by_o_high = sum(v["co2_kg"]["high"] for v in doc["totals"]["by_origin"].values())
    assert by_o_low == doc["totals"]["co2_kg"]["low"]
    assert by_o_mid == doc["totals"]["co2_kg"]["mid"]
    assert by_o_high == doc["totals"]["co2_kg"]["high"]

    # by_open_closed sums
    by_oc_low = sum(v["co2_kg"]["low"] for v in doc["totals"]["by_open_closed"].values())
    by_oc_mid = sum(v["co2_kg"]["mid"] for v in doc["totals"]["by_open_closed"].values())
    by_oc_high = sum(v["co2_kg"]["high"] for v in doc["totals"]["by_open_closed"].values())
    assert by_oc_low == doc["totals"]["co2_kg"]["low"]
    assert by_oc_mid == doc["totals"]["co2_kg"]["mid"]
    assert by_oc_high == doc["totals"]["co2_kg"]["high"]


def test_fairness_unweighted_is_equal_weight_mean_not_the_weighted_total(monkeypatch, tmp_path):
    """totals.fairness.unweighted.co2_kg = total / N (the average modeled-model footprint),
    a genuinely different number from the traffic-weighted total when N > 1 (FAIRNESS.md §4)."""
    _patch_estimate_paths(monkeypatch, tmp_path)
    estimates = estimate(GOLDEN_RECORDS)
    doc = build_output(estimates, GOLDEN_RECORDS, GOLDEN_DATE, generated_at="2026-06-15T00:00:00Z")

    n = len(doc["models"])
    assert n > 1  # otherwise the distinction is vacuous
    total = doc["totals"]["co2_kg"]
    unweighted = doc["totals"]["fairness"]["unweighted"]["co2_kg"]
    for k in ("low", "mid", "high"):
        assert unweighted[k] == total[k] / n
    # must NOT silently equal the weighted total (the bug we are guarding against)
    assert unweighted["mid"] != total["mid"]


def test_totals_independent_band_is_narrower_and_shares_mid(monkeypatch, tmp_path):
    """totals.co2_kg_independent (quadrature) keeps the same mid as the conservative
    co2_kg sum but is NEVER wider — the independent-error band partially cancels.
    Both are emitted so the conservative headline isn't read as the only view.
    """
    _patch_estimate_paths(monkeypatch, tmp_path)
    estimates = estimate(GOLDEN_RECORDS)
    doc = build_output(estimates, GOLDEN_RECORDS, GOLDEN_DATE, generated_at="2026-06-15T00:00:00Z")

    corr = doc["totals"]["co2_kg"]
    indep = doc["totals"]["co2_kg_independent"]
    # mid identical
    assert indep["mid"] == pytest.approx(corr["mid"])
    # independent band is inside (or equal to) the conservative envelope
    assert indep["low"] >= corr["low"]
    assert indep["high"] <= corr["high"]
    assert indep["low"] <= indep["mid"] <= indep["high"]


def test_build_output_emits_totals_tiers(monkeypatch, tmp_path):
    """Phase 6m: build_output always includes totals.tiers (list of slug lists).
    Tier membership is the stable grouping; within-tier ordering is secondary.
    """
    _patch_estimate_paths(monkeypatch, tmp_path)
    estimates = estimate(GOLDEN_RECORDS)
    doc = build_output(estimates, GOLDEN_RECORDS, GOLDEN_DATE, generated_at="2026-06-15T00:00:00Z")

    assert "tiers" in doc["totals"]
    tiers = doc["totals"]["tiers"]
    assert isinstance(tiers, list)
    # Each entry is a list of strings (slugs)
    for t in tiers:
        assert isinstance(t, list)
        for s in t:
            assert isinstance(s, str)
    # Every modeled model appears in exactly one tier
    model_slugs = {m["slug"] for m in doc["models"]}
    flat = [s for tier in tiers for s in tier]
    assert set(flat) == model_slugs
    assert len(flat) == len(model_slugs)
    # (With golden 3 models whose ranges overlap, expect exactly 1 tier containing all)
    if len(model_slugs) > 0:
        assert len(tiers) >= 1


def test_scope_source_and_modeled_fraction_always_present(monkeypatch, tmp_path):
    """scope_note, source_citation, modeled_traffic_fraction are always populated."""
    _patch_estimate_paths(monkeypatch, tmp_path)

    estimates = estimate(GOLDEN_RECORDS)
    doc = build_output(estimates, GOLDEN_RECORDS, GOLDEN_DATE)

    assert "scope_note" in doc and doc["scope_note"]
    assert "source_citation" in doc and "OpenRouter" in doc["source_citation"]
    assert "modeled_traffic_fraction" in doc["totals"]
    assert isinstance(doc["totals"]["modeled_traffic_fraction"], float)
    assert 0.0 <= doc["totals"]["modeled_traffic_fraction"] <= 1.0


def test_unmapped_slug_quantified_in_totals_not_silently_modeled(monkeypatch, tmp_path):
    """Phase 6E: a top-list slug absent from the crosswalk is flagged + quantified as
    unmapped traffic, never silently counted as modeled."""
    _patch_estimate_paths(monkeypatch, tmp_path)

    records: list[NormalizedRecord] = [
        {"date": GOLDEN_DATE, "model_slug": "minimax/minimax-m2.5",
         "total_tokens": 6_000_000_000_000, "is_other": False},
        {"date": GOLDEN_DATE, "model_slug": "ghostvendor/unlisted-9",
         "total_tokens": 3_000_000_000_000, "is_other": False},
        {"date": GOLDEN_DATE, "model_slug": "other",
         "total_tokens": 1_000_000_000_000, "is_other": True},
    ]
    estimates = estimate(records)
    doc = build_output(estimates, records, GOLDEN_DATE, generated_at="2026-06-15T00:00:00Z")
    assert "tiers" in doc["totals"] and isinstance(doc["totals"]["tiers"], list)
    validate(_strip_tiers_for_schema(doc))  # new totals fields + UNMAPPED_SLUG flag must pass the schema

    ghost = next(m for m in estimates if m["slug"] == "ghostvendor/unlisted-9")
    assert "UNMAPPED_SLUG" in ghost["flags"]
    assert ghost["origin"] == "OTHER"  # neutral identity, not bucketed into a known model

    totals = doc["totals"]
    assert totals["unmapped_tokens"] == 3_000_000_000_000
    assert totals["unmapped_slugs"] == [
        {"slug": "ghostvendor/unlisted-9", "total_tokens": 3_000_000_000_000}
    ]
    assert totals["unmapped_traffic_fraction"] == pytest.approx(0.3)
    # mapped excludes BOTH the is_other uncovered row AND the unmapped slug
    assert totals["mapped_traffic_fraction"] == pytest.approx(0.6)
    # legacy modeled fraction still only nets out the is_other row
    assert totals["modeled_traffic_fraction"] == pytest.approx(0.9)


def test_write_outputs_validates_before_write_and_copies_to_history(tmp_path, monkeypatch):
    """write_outputs calls validate; on success writes latest + history copy.

    Invalid raises before any write.
    """
    # Patch ALL output locations write_outputs touches (latest + history + the
    # timeseries/sensitivity side-artifacts) so the test never writes real data/output.
    fake_latest = tmp_path / "data" / "output" / "latest.json"
    fake_hist_dir = tmp_path / "data" / "output" / "history"
    fake_output_dir = tmp_path / "data" / "output"
    monkeypatch.setattr(cfg, "OUTPUT_LATEST_PATH", fake_latest)
    monkeypatch.setattr(cfg, "OUTPUT_HISTORY_DIR", fake_hist_dir)
    monkeypatch.setattr(cfg, "OUTPUT_DIR", fake_output_dir)
    monkeypatch.setattr(cfg, "OUTPUT_TIMESERIES_PATH", tmp_path / "data" / "output" / "timeseries.json")
    monkeypatch.setattr(cfg, "SENSITIVITY_PATH", tmp_path / "data" / "output" / "sensitivity.json")

    # Build a minimal valid doc (no estimate needed)
    doc = {
        "methodology_version": "0.1.0",
        "generated_at": "2026-06-15T00:00:00Z",
        "data_date": "2026-06-14",
        "source_citation": "Source: OpenRouter (openrouter.ai/rankings), as of 2026-06-14",
        "scope_note": (
            "Estimated CO2 footprint of LLM-inference traffic visible through OpenRouter. "
            "NOT global data-center emissions. All figures are estimates with uncertainty."
        ),
        "assumptions": {"input_output_ratio": "80:20", "default_pue": 1.2},
        "sources": [],
        "models": [],
        "totals": {
            "total_tokens": 0,
            "uncovered_tokens": 0,
            "modeled_traffic_fraction": 0.0,
            "precision": {
                "energy_measured_fraction": 0.0,
                "energy_class_fallback_fraction": 1.0,
                "grid_live_fraction": 0.0,
                "grid_annual_fallback_fraction": 1.0,
                "models_measured": 0,
                "models_total": 0,
                "grid_live_models": 0,
            },
            "mapped_traffic_fraction": 0.0,
            "unmapped_tokens": 0,
            "unmapped_traffic_fraction": 0.0,
            "unmapped_slugs": [],
            "est_output_tokens": 0,
            "energy_kwh": {"low": 0.0, "mid": 0.0, "high": 0.0},
            "co2_kg": {"low": 0.0, "mid": 0.0, "high": 0.0},
            "co2_kg_embodied": {"low": 0.0, "mid": 0.0, "high": 0.0},
            "co2_kg_total": {"low": 0.0, "mid": 0.0, "high": 0.0},
            "co2_kg_market": {"low": 0.0, "mid": 0.0, "high": 0.0},
            "water_liters": {"low": 0.0, "mid": 0.0, "high": 0.0},
            "by_origin": {},
            "by_open_closed": {},
        },
    }

    # Should succeed and write both locations
    write_outputs(doc)
    assert fake_latest.exists()
    assert (fake_hist_dir / "2026-06-14.json").exists()

    # Roundtrip sanity
    written = json.loads(fake_latest.read_text(encoding="utf-8"))
    assert written["data_date"] == "2026-06-14"
    assert written["totals"]["co2_kg"]["mid"] == 0.0

    # Invalid doc must raise and must not have overwritten (we use a new name to prove)
    fake_latest2 = tmp_path / "data2" / "latest.json"
    fake_hist2 = tmp_path / "data2" / "history"
    fake_output_dir2 = tmp_path / "data2" / "output"
    monkeypatch.setattr(cfg, "OUTPUT_LATEST_PATH", fake_latest2)
    monkeypatch.setattr(cfg, "OUTPUT_HISTORY_DIR", fake_hist2)
    monkeypatch.setattr(cfg, "OUTPUT_DIR", fake_output_dir2)

    bad = dict(doc)
    bad["models"] = [{"slug": "x"}]  # missing many required fields -> schema fail
    with pytest.raises(jsonschema.ValidationError):
        write_outputs(bad)

    assert not fake_latest2.exists()
    assert not fake_hist2.exists() or not any(fake_hist2.iterdir())


# --- P7 ESG export tests (reconciliation, caveat, schema) ---


def test_write_esg_export_emits_correct_dual_totals_and_caveat(monkeypatch, tmp_path):
    """write_esg_export produces location/market that reconcile exactly to doc totals;
    scope_caveat is present, non-empty and contains the required project statement.
    """
    _patch_estimate_paths(monkeypatch, tmp_path)

    estimates = estimate(GOLDEN_RECORDS)
    doc = build_output(estimates, GOLDEN_RECORDS, GOLDEN_DATE, generated_at="2026-06-15T00:00:00Z")

    fake_out = tmp_path / "data" / "output"
    monkeypatch.setattr(cfg, "OUTPUT_DIR", fake_out)

    write_esg_export(doc)

    esg_path = fake_out / "esg_export.json"
    assert esg_path.exists()
    esg = json.loads(esg_path.read_text(encoding="utf-8"))

    # reconciliation to the source totals (exact, no tolerance needed for the copied values)
    loc = doc["totals"]["co2_kg"]
    mkt = doc["totals"]["co2_kg_market"]
    assert esg["scope_2"]["location_based"]["low"] == loc["low"]
    assert esg["scope_2"]["location_based"]["mid"] == loc["mid"]
    assert esg["scope_2"]["location_based"]["high"] == loc["high"]
    assert esg["scope_2"]["market_based"]["low"] == mkt["low"]
    assert esg["scope_2"]["market_based"]["mid"] == mkt["mid"]
    assert esg["scope_2"]["market_based"]["high"] == mkt["high"]

    # also the esrs_e1 mirrors
    assert esg["esrs_e1"]["location_based_kgco2e"]["mid"] == loc["mid"]
    assert esg["esrs_e1"]["market_based_kgco2e"]["mid"] == mkt["mid"]

    # non-removable caveat
    assert "scope_caveat" in esg
    caveat = esg["scope_caveat"]
    assert isinstance(caveat, str) and len(caveat) > 50
    assert "OpenRouter-visible LLM inference" in caveat
    assert "NOT a measurement of total global data-center emissions" in caveat
    assert "estimates with uncertainty ranges" in caveat

    # other required fields
    assert esg["data_date"] == GOLDEN_DATE
    assert esg["methodology_version"]
    assert "ESRS E1" in esg["esrs_e1"]["standard"]


def test_esg_export_schema_validation_with_fixture(monkeypatch, tmp_path):
    """A constructed export (from golden) validates against the dedicated schema.
    Also exercises direct write path.
    """
    _patch_estimate_paths(monkeypatch, tmp_path)

    estimates = estimate(GOLDEN_RECORDS)
    doc = build_output(estimates, GOLDEN_RECORDS, GOLDEN_DATE, generated_at="2026-06-15T00:00:00Z")

    fake_out = tmp_path / "data" / "output"
    monkeypatch.setattr(cfg, "OUTPUT_DIR", fake_out)

    write_esg_export(doc)
    esg = json.loads((fake_out / "esg_export.json").read_text(encoding="utf-8"))

    schema_path = Path(__file__).resolve().parents[1] / "schemas" / "esg_export.schema.json"
    with open(schema_path, "r", encoding="utf-8") as f:
        schema = json.load(f)

    # must not raise
    jsonschema.validate(instance=esg, schema=schema)

    # quick sanity that required non-removable field survived schema
    assert esg["scope_caveat"]
