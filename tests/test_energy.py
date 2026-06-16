"""Tests for pipeline.energy (wh lookup + kWh conversion).

Per phase-2 spec + ENGINEERING_STANDARDS §5 + Phase 6j:
- known model lookup returns exact wh + declared source, no flags
- unknown slug -> UNKNOWN_MODEL + FALLBACK_ENERGY_CLASS + class band, no crash
- explicit parameter_class_fallback in cw -> FALLBACK_ENERGY_CLASS
- missing intensity row for declared source -> fallback + flag
- energy_kwh performs /1000 guard and produces Range
- Wh <-> kWh conversion on known inputs
- Range invariant after energy ops
- No network (tables are dict fixtures)
- Phase 6j: intensity measured rows take priority over cw fallback (flips energy_source, no FALLBACK flag)
- Phase 6j: every model entry in real intensity.yaml has resolvable source_id (fabrication guard)
- Phase 6j: energy_measured_fraction (via precision) equals token-weighted share of upgraded models
- Phase 6j: un-upgraded retain FALLBACK_ENERGY_CLASS
- Phase 6j: idle regression — large-model implied Wh/query band contains ~3.96 only when idle term included (E-IDLE + E-METHOD)
- P5: MoE active_params_b (not total) selects class band (230B/10B -> SMALL); fallback to params_b only if active absent
- P6: energy_kwh accepts regime_multiplier (R-*) and multiplies (before/after idle)
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

# Make local pipeline package importable when running pytest from repo root
# (matches pattern used by Phase 0 tests/test_prove_math.py).
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from pipeline.energy import energy_kwh, wh_per_output_token
from pipeline.ranges import Range

# --- small table fixtures (no fs, pure) ---

CROSSWALK_MINI = [
    {
        "openrouter_slug": "minimax/minimax-m2.5",
        "display_name": "MiniMax M2.5",
        "origin": "CN",
        "open_or_closed": "open",
        "energy_source": "ai_energy_score",
        "assumed_region": "cn-north",
    },
    {
        "openrouter_slug": "openai/gpt-4o",
        "display_name": "GPT-4o",
        "origin": "US",
        "open_or_closed": "closed",
        "energy_source": "parameter_class_fallback",
        "assumed_provider": "openai",
        "assumed_region": "us-east",
    },
]

INTENSITY_MINI = {
    "models": [
        {
            "openrouter_slug": "minimax/minimax-m2.5",
            "wh_per_output_token": {"low": 0.0008, "mid": 0.0015, "high": 0.003},
            "source": "AI Energy Score v2; see ASSUMPTIONS.md#E-MINIMAX-M2.5",
            "source_id": "E-MINIMAX-M2.5",
        }
    ],
    "parameter_class_fallback": [
        {
            "max_active_params_b": 15,
            "wh_per_output_token": {"low": 0.0005, "mid": 0.0012, "high": 0.0025},
            "source": "ASSUMPTIONS.md#E-CLASS-SMALL",
            "source_id": "E-CLASS-SMALL",
        },
        {
            "max_active_params_b": 100,
            "wh_per_output_token": {"low": 0.002, "mid": 0.005, "high": 0.012},
            "source": "ASSUMPTIONS.md#E-CLASS-LARGE",
            "source_id": "E-CLASS-LARGE",
        },
    ],
}


def test_known_model_exact_lookup_and_no_flag():
    wh, src, flags, sid = wh_per_output_token(
        "minimax/minimax-m2.5", CROSSWALK_MINI, INTENSITY_MINI
    )
    assert isinstance(wh, Range)
    assert wh.low == 0.0008 and wh.mid == 0.0015 and wh.high == 0.003
    assert src == "ai_energy_score"
    assert sid == "E-MINIMAX-M2.5"  # Phase 6G: per-figure provenance source_id
    assert flags == []


def test_unknown_slug_gets_unknown_and_class_fallback():
    wh, src, flags, sid = wh_per_output_token("foo/unknown-xyz", CROSSWALK_MINI, INTENSITY_MINI)
    assert src == "parameter_class_fallback"
    assert "UNKNOWN_MODEL" in flags
    assert "FALLBACK_ENERGY_CLASS" in flags
    # conservative large band chosen for unknown
    assert wh.mid == 0.005
    assert sid == "E-CLASS-LARGE"  # fallback band's provenance source_id


def test_explicit_param_fallback_in_cw():
    wh, src, flags, sid = wh_per_output_token("openai/gpt-4o", CROSSWALK_MINI, INTENSITY_MINI)
    assert src == "parameter_class_fallback"
    assert "FALLBACK_ENERGY_CLASS" in flags
    assert wh.low == 0.002  # large band


def test_missing_intensity_row_falls_back():
    cw = [{"openrouter_slug": "bar/missing", "energy_source": "ai_energy_score"}]
    wh, src, flags, sid = wh_per_output_token("bar/missing", cw, INTENSITY_MINI)
    assert src == "parameter_class_fallback"
    assert "FALLBACK_ENERGY_CLASS" in flags


def test_energy_kwh_conversion_guard():
    # 1000 output tokens * 2.0 Wh/token = 2000 Wh = 2.0 kWh
    wh = Range(1.0, 2.0, 4.0)
    kwh = energy_kwh(wh, 1000)
    assert kwh.low == 1.0 and kwh.mid == 2.0 and kwh.high == 4.0
    # known input
    assert energy_kwh(Range(0.0015, 0.0015, 0.0015), 1_000_000_000).mid == 1500.0


def test_kwh_and_range_invariants():
    k = energy_kwh(Range(0.0005, 0.0012, 0.0025), 910_000_000_000)
    assert k.low <= k.mid <= k.high
    # zero tokens
    z = energy_kwh(Range(0.1, 0.2, 0.3), 0)
    assert z.low == 0 and z.mid == 0 and z.high == 0


def test_prefill_input_term_adds_decode_plus_prefill():
    # v0.2 (E-PREFILL): energy = decode(out) + alpha*wh*in, both /1000.
    wh = Range(1.0, 2.0, 4.0)  # Wh per output token
    alpha = Range(0.1, 0.2, 0.3)
    # 1000 output + 4000 input tokens
    kwh = energy_kwh(wh, 1000, input_tokens=4000, prefill_alpha=alpha)
    # mid: (2.0*1000 + 2.0*0.2*4000)/1000 = (2000 + 1600)/1000 = 3.6 kWh
    assert kwh.mid == pytest.approx(3.6)
    # low:  (1.0*1000 + 1.0*0.1*4000)/1000 = (1000 + 400)/1000 = 1.4
    assert kwh.low == pytest.approx(1.4)
    # high: (4.0*1000 + 4.0*0.3*4000)/1000 = (4000 + 4800)/1000 = 8.8
    assert kwh.high == pytest.approx(8.8)
    assert kwh.low <= kwh.mid <= kwh.high


def test_prefill_absent_reduces_to_output_only():
    # Backward compatible: no input/alpha -> legacy decode-only result.
    wh = Range(1.0, 2.0, 4.0)
    assert energy_kwh(wh, 1000).to_dict() == energy_kwh(wh, 1000, 0, None).to_dict()


# --- Phase 6j additions (sourced measured priority + idle + guards) ---

from pathlib import Path

import yaml  # project env has pyyaml (used for guard)


def test_intensity_measured_overrides_cw_fallback_priority():
    """Phase 6j: explicit row in intensity.models promotes to measured even if cw declares fallback.
    This is how top-traffic models (new slugs) get energy_source flipped without touching crosswalk.
    """
    cw_fallback = [
        {
            "openrouter_slug": "deepseek/deepseek-v4-pro",
            "energy_source": "parameter_class_fallback",
            "origin": "CN",
            "open_or_closed": "open",
        }
    ]
    # mini intensity extended with a v4-pro measured (same numbers as deepseek seed)
    int_with_v4 = {
        "models": [
            {
                "openrouter_slug": "deepseek/deepseek-v4-pro",
                "wh_per_output_token": {"low": 0.0015, "mid": 0.0035, "high": 0.0080},
                "energy_source": "ai_energy_score",
                "source_id": "E-DEEPSEEK-V4-PRO",
            }
        ],
        "parameter_class_fallback": INTENSITY_MINI["parameter_class_fallback"],
    }
    wh, src, flags, sid = wh_per_output_token("deepseek/deepseek-v4-pro-20260423", cw_fallback, int_with_v4)
    assert src == "ai_energy_score"
    assert "FALLBACK_ENERGY_CLASS" not in flags
    assert sid == "E-DEEPSEEK-V4-PRO"
    assert wh.mid == 0.0035


def test_every_intensity_model_entry_has_resolvable_source_id():
    """Phase 6j fabrication guard (per spec + CLAUDE.md): every models[] entry in the
    committed intensity.yaml MUST list a source_id that resolves in sources.yaml.
    A missing or unknown id would indicate an unsourced (fabricated) number.
    """
    intensity_path = Path(__file__).resolve().parents[1] / "data" / "energy" / "intensity.yaml"
    sources_path = Path(__file__).resolve().parents[1] / "data" / "provenance" / "sources.yaml"
    intensity = yaml.safe_load(intensity_path.read_text())
    sources = yaml.safe_load(sources_path.read_text())
    source_ids = {s["id"] for s in sources}

    models = intensity.get("models", [])
    assert len(models) >= 6, "expected at least the seeded measured entries"
    for m in models:
        sid = m.get("source_id")
        assert sid is not None, f"model {m.get('openrouter_slug')} missing source_id"
        assert sid in source_ids, f"source_id {sid} for {m.get('openrouter_slug')} does not resolve in sources.yaml"
        # also check idle_source_id if present
        if "idle_kwh_per_day" in m:
            idle_sid = m.get("idle_source_id")
            assert idle_sid is not None, f"idle present but no idle_source_id on {m.get('openrouter_slug')}"
            assert idle_sid in source_ids, f"idle_source_id {idle_sid} does not resolve"

    # also the fallback bands must be sourced (they carry source_id)
    for band in intensity.get("parameter_class_fallback", []):
        sid = band.get("source_id")
        assert sid is not None and sid in source_ids


def test_energy_measured_fraction_matches_token_share_of_upgraded():
    """Phase 6j: when N models are 'upgraded' (energy_source ai/ecologits), the
    energy_measured_fraction computed token-weighted must equal their share of tokens.
    Uses real precision_fractions (read-only import).
    """
    from pipeline.precision import precision_fractions

    # Fixture: 4 models, 2 upgraded. tokens chosen so upgraded share = 0.4
    estimates = [
        {"total_tokens": 1000, "energy_source": "ai_energy_score"},      # upgraded
        {"total_tokens": 2000, "energy_source": "parameter_class_fallback"},
        {"total_tokens": 1000, "energy_source": "ai_energy_score"},      # upgraded
        {"total_tokens": 1000, "energy_source": "parameter_class_fallback"},
    ]
    fracs = precision_fractions(estimates)
    # upgraded tokens = 2000; total=5000 => 0.4
    assert abs(fracs["energy_measured_fraction"] - 0.4) < 1e-9
    assert abs(fracs["energy_class_fallback_fraction"] - 0.6) < 1e-9


def test_unupgraded_models_retain_fallback_flag():
    """Existing + 6j: models without intensity measured row (or cw fallback) retain FALLBACK_ENERGY_CLASS."""
    # reuse explicit param fallback test case
    wh, src, flags, sid = wh_per_output_token("openai/gpt-4o", CROSSWALK_MINI, INTENSITY_MINI)
    assert src == "parameter_class_fallback"
    assert "FALLBACK_ENERGY_CLASS" in flags

    # also a brand new slug with no row
    wh2, src2, flags2, _ = wh_per_output_token("vendor/new-hotness-20260601", CROSSWALK_MINI, INTENSITY_MINI)
    assert src2 == "parameter_class_fallback"
    assert "UNKNOWN_MODEL" in flags2
    assert "FALLBACK_ENERGY_CLASS" in flags2


def test_idle_regression_large_model_implied_wh_per_query_contains_bloom_3_96():
    """Phase 6j idle justification regression.
    A comparable large model's (deepseek-class) implied Wh/query (dynamic + idle contrib)
    band must CONTAIN ~3.96 (the BLOOM all-in figure) when idle term is supplied,
    and must NOT contain it on the pure dynamic path.
    Uses E-METHOD divisor (150) and synthetic but representative query volume + share.
    """
    # deepseek-class wh band (matches intensity entry for deepseek-chat / v4)
    wh = Range(0.0015, 0.0035, 0.0080)
    D = 150  # E-METHOD mean output tokens per benchmark query
    queries = 500_000
    out_tokens = queries * D

    # idle from intensity (defensible large), share chosen for test visibility of gap
    idle = Range(3000, 8500, 18000)
    share = 0.2

    # with idle
    total_kwh = energy_kwh(wh, out_tokens, 0, None, idle_kwh_per_day=idle, share_of_day=share)
    wh_per_q_with = (total_kwh * 1000.0) / queries

    # without idle (dynamic only)
    total_kwh_dyn = energy_kwh(wh, out_tokens)
    wh_per_q_dyn = (total_kwh_dyn * 1000.0) / queries

    # dynamic alone (high of large class * D) << 3.96
    assert wh_per_q_dyn.high < 2.0
    # combined band (high of dynamic + idle contrib) covers the BLOOM 3.96 figure
    assert wh_per_q_with.low <= 3.96 <= wh_per_q_with.high
    # sanity: idle actually moved the band up
    assert wh_per_q_with.mid > wh_per_q_dyn.mid + 1.0


# --- P5 MoE active params tests ---

def test_moe_active_params_selects_small_class_not_total():
    """P5: 230B-total / 10B-active MoE (MiniMax-like) with parameter_class_fallback
    must select the *small-active* band (E-CLASS-SMALL), not the large-total class.
    This validates active_params_b takes precedence over params_b for band choice.
    """
    cw_moe = [
        {
            "openrouter_slug": "bigmoe/example-230b-a10b",
            "energy_source": "parameter_class_fallback",
            "params_b": 230,
            "active_params_b": 10,
        }
    ]
    wh, src, flags, sid = wh_per_output_token("bigmoe/example-230b-a10b", cw_moe, INTENSITY_MINI)
    assert src == "parameter_class_fallback"
    assert "FALLBACK_ENERGY_CLASS" in flags
    # must be the SMALL band (mid 0.0012), not LARGE (0.005)
    assert wh.mid == 0.0012
    assert wh.low == 0.0005 and wh.high == 0.0025
    assert sid == "E-CLASS-SMALL"


def test_active_params_fallback_to_total_when_active_absent():
    """P5: when only params_b present (no active), still use it for sizing (legacy open dense)."""
    cw_dense = [
        {
            "openrouter_slug": "dense/example-70b",
            "energy_source": "parameter_class_fallback",
            "params_b": 70,
            "active_params_b": None,
        }
    ]
    wh, src, flags, sid = wh_per_output_token("dense/example-70b", cw_dense, INTENSITY_MINI)
    assert src == "parameter_class_fallback"
    assert wh.mid == 0.005  # 70 >15 -> LARGE
    assert sid == "E-CLASS-LARGE"


def test_energy_kwh_regime_multiplier_p6():
    """P6: regime_multiplier (from R-* bands) scales the dynamic kWh (decode+prefill); Range preserved.
    Default None = *1 (no change). Monotonic not asserted here (see scenario.test + regime_factors).
    """
    base_wh = Range(0.001, 0.002, 0.004)
    # ref (no regime)
    k0 = energy_kwh(base_wh, 1000, 0, None)
    assert k0.mid == 0.002
    # med-low ~1.65
    regime = Range(1.35, 1.65, 2.10)
    k = energy_kwh(base_wh, 1000, 0, None, None, 0.0, regime)
    assert k.low == pytest.approx(0.00135)
    assert k.mid == pytest.approx(0.0033)
    assert k.high == pytest.approx(0.0084)
    assert k.low <= k.mid <= k.high
    # with prefill too
    alpha = Range(0.1, 0.2, 0.3)
    kr = energy_kwh(base_wh, 1000, input_tokens=500, prefill_alpha=alpha, regime_multiplier=regime)
    # without would be (2 + 0.2*0.5*2? wait calc) but check scaled
    k_base = energy_kwh(base_wh, 1000, 500, alpha)
    assert kr.mid == pytest.approx(k_base.mid * 1.65)
