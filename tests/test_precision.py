"""Phase 6F tests for pipeline/precision.py — estimation-tier honesty.

Pure functions over per-model records: tier mapping + token-weighted fractions.
No network, no fixtures on disk.
"""
from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from pipeline.precision import energy_tier, grid_tier, precision_fractions

TOL = 1e-9


def _model(slug: str, tokens: int, energy_source: str, grid_source: str) -> dict:
    return {
        "slug": slug,
        "total_tokens": tokens,
        "energy_source": energy_source,
        "grid_source": grid_source,
    }


def test_energy_tier_mapping():
    assert energy_tier(_model("a", 1, "ai_energy_score", "annual_factor")) == "measured"
    assert energy_tier(_model("b", 1, "ecologits", "annual_factor")) == "measured"
    assert (
        energy_tier(_model("c", 1, "parameter_class_fallback", "annual_factor"))
        == "class_fallback"
    )


def test_grid_tier_mapping():
    assert grid_tier(_model("a", 1, "ecologits", "electricity_maps_live")) == "live"
    assert grid_tier(_model("b", 1, "ecologits", "annual_factor")) == "annual_fallback"


def test_mixed_fixture_is_token_weighted():
    """Hand-built day with mixed sources yields the expected token-weighted fractions.

    Energy measured = ai_energy_score + ecologits tokens = 60 + 10 = 70 of 100.
    Grid live = electricity_maps_live tokens = 60 of 100.
    Token-weighted, NOT count-weighted (2 of 3 models measured would be 0.667).
    """
    models = [
        _model("big-measured", 60, "ai_energy_score", "electricity_maps_live"),
        _model("small-measured", 10, "ecologits", "annual_factor"),
        _model("fallback", 30, "parameter_class_fallback", "annual_factor"),
    ]
    f = precision_fractions(models)
    assert f["energy_measured_fraction"] == pytest.approx(0.70)
    assert f["energy_class_fallback_fraction"] == pytest.approx(0.30)
    assert f["grid_live_fraction"] == pytest.approx(0.60)
    assert f["grid_annual_fallback_fraction"] == pytest.approx(0.40)


def test_axis_guard_each_axis_sums_to_one_and_in_range():
    models = [
        _model("a", 7, "ai_energy_score", "electricity_maps_live"),
        _model("b", 13, "parameter_class_fallback", "annual_factor"),
        _model("c", 5, "ecologits", "annual_factor"),
    ]
    f = precision_fractions(models)
    assert f["energy_measured_fraction"] + f["energy_class_fallback_fraction"] == pytest.approx(1.0)
    assert f["grid_live_fraction"] + f["grid_annual_fallback_fraction"] == pytest.approx(1.0)
    for k in f:
        assert -TOL <= f[k] <= 1.0 + TOL


def test_all_fallback_case_todays_reality():
    """Every row on parameter_class_fallback + annual_factor -> 0% measured, 0% live."""
    models = [
        _model("x", 100, "parameter_class_fallback", "annual_factor"),
        _model("y", 250, "parameter_class_fallback", "annual_factor"),
    ]
    f = precision_fractions(models)
    assert f["energy_measured_fraction"] == 0.0
    assert f["grid_live_fraction"] == 0.0
    assert f["energy_class_fallback_fraction"] == 1.0
    assert f["grid_annual_fallback_fraction"] == 1.0


def test_empty_defaults_to_all_fallback_and_sums_to_one():
    f = precision_fractions([])
    assert f["energy_measured_fraction"] == 0.0
    assert f["grid_live_fraction"] == 0.0
    assert f["energy_class_fallback_fraction"] == 1.0
    assert f["grid_annual_fallback_fraction"] == 1.0
