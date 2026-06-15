"""Tests for pipeline.energy (wh lookup + kWh conversion).

Per phase-2 spec + ENGINEERING_STANDARDS §5:
- known model lookup returns exact wh + declared source, no flags
- unknown slug -> UNKNOWN_MODEL + FALLBACK_ENERGY_CLASS + class band, no crash
- explicit parameter_class_fallback in cw -> FALLBACK_ENERGY_CLASS
- missing intensity row for declared source -> fallback + flag
- energy_kwh performs /1000 guard and produces Range
- Wh <-> kWh conversion on known inputs
- Range invariant after energy ops
- No network (tables are dict fixtures)
"""

from __future__ import annotations

import sys
from pathlib import Path

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
        }
    ],
    "parameter_class_fallback": [
        {
            "max_active_params_b": 15,
            "wh_per_output_token": {"low": 0.0005, "mid": 0.0012, "high": 0.0025},
            "source": "ASSUMPTIONS.md#E-CLASS-SMALL",
        },
        {
            "max_active_params_b": 100,
            "wh_per_output_token": {"low": 0.002, "mid": 0.005, "high": 0.012},
            "source": "ASSUMPTIONS.md#E-CLASS-LARGE",
        },
    ],
}


def test_known_model_exact_lookup_and_no_flag():
    wh, src, flags = wh_per_output_token("minimax/minimax-m2.5", CROSSWALK_MINI, INTENSITY_MINI)
    assert isinstance(wh, Range)
    assert wh.low == 0.0008 and wh.mid == 0.0015 and wh.high == 0.003
    assert src == "ai_energy_score"
    assert flags == []


def test_unknown_slug_gets_unknown_and_class_fallback():
    wh, src, flags = wh_per_output_token("foo/unknown-xyz", CROSSWALK_MINI, INTENSITY_MINI)
    assert src == "parameter_class_fallback"
    assert "UNKNOWN_MODEL" in flags
    assert "FALLBACK_ENERGY_CLASS" in flags
    # conservative large band chosen for unknown
    assert wh.mid == 0.005


def test_explicit_param_fallback_in_cw():
    wh, src, flags = wh_per_output_token("openai/gpt-4o", CROSSWALK_MINI, INTENSITY_MINI)
    assert src == "parameter_class_fallback"
    assert "FALLBACK_ENERGY_CLASS" in flags
    assert wh.low == 0.002  # large band


def test_missing_intensity_row_falls_back():
    cw = [{"openrouter_slug": "bar/missing", "energy_source": "ai_energy_score"}]
    wh, src, flags = wh_per_output_token("bar/missing", cw, INTENSITY_MINI)
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
