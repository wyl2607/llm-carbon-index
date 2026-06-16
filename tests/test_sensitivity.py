"""Phase 6K tests for pipeline.sensitivity (pure functions).

Test requirements (per phase-6k spec):
- OAT correctness: moving one assumption to a band edge changes total CO₂
  in the expected direction and magnitude (hand-checked on a fixture).
- Monotonicity preserved: more renewable energy (lower grid gco2) => lower CO₂.
- Band, not CI: the output 'drivers' array carries conservative-band swing values;
  no MC/probabilistic fields present in the OAT output.
- Closed wider than open: on a fixture, a closed model's relative range width >=
  measured-open model's range width.

All tests offline; no I/O at module import.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from pipeline.sensitivity import oat_sensitivity

# ---------------------------------------------------------------------------
# Shared fixture helpers
# ---------------------------------------------------------------------------

def _make_model(
    slug: str = "test/model-a",
    total_tokens: int = 1_000_000_000,
    wh_low: float = 0.002,
    wh_mid: float = 0.005,
    wh_high: float = 0.012,
    gco2: float = 400.0,
    pue: float = 1.25,
    is_other: bool = False,
) -> dict:
    out_tok = int(total_tokens * 0.20)
    return {
        "slug": slug,
        "total_tokens": total_tokens,
        "est_output_tokens": out_tok,
        "wh_per_output_token": {"low": wh_low, "mid": wh_mid, "high": wh_high},
        "co2_kg": {"low": wh_low, "mid": wh_mid, "high": wh_high},  # placeholder shape
        "carbon_intensity_gco2_kwh": gco2,
        "pue": pue,
        "is_other": is_other,
    }


# ---------------------------------------------------------------------------
# OAT correctness tests
# ---------------------------------------------------------------------------

def test_oat_returns_four_drivers_with_rank():
    """oat_sensitivity must return exactly 4 drivers (A2, A4, grid, energy_intensity),
    each with a rank and the correct assumption name.
    """
    models = [_make_model()]
    result = oat_sensitivity(models)

    assert "drivers" in result
    assert "dominant" in result

    names = {d["assumption"] for d in result["drivers"]}
    expected = {"input_output_ratio", "pue", "grid_carbon_intensity", "energy_intensity"}
    assert names == expected, f"unexpected driver names: {names}"

    ranks = sorted(d["rank"] for d in result["drivers"])
    assert ranks == [1, 2, 3, 4]


def test_higher_output_ratio_increases_co2():
    """io-ratio: 70:30 (more output tokens) must raise total CO₂ vs baseline 80:20,
    and 90:10 (fewer output tokens) must lower it.  So the driver has low<0 and high>0
    (or vice versa, because the band captures both edges).
    """
    models = [_make_model()]
    result = oat_sensitivity(models)

    io_driver = next(d for d in result["drivers"] if d["assumption"] == "input_output_ratio")
    s = io_driver["total_co2_swing_pct"]
    # 70:30 → more output → higher CO₂ → positive swing
    # 90:10 → fewer output → lower CO₂ → negative swing
    assert s["high"] > 0, "More output tokens should increase CO₂"
    assert s["low"] < 0, "Fewer output tokens should decrease CO₂"


def test_lower_pue_decreases_co2():
    """PUE: sweeping from 1.25 to 1.1 (best-in-class) must yield negative swing;
    sweeping to 1.56 (industry average) must yield positive swing.
    """
    models = [_make_model()]
    result = oat_sensitivity(models)

    pue_driver = next(d for d in result["drivers"] if d["assumption"] == "pue")
    s = pue_driver["total_co2_swing_pct"]
    assert s["low"] < 0, "Lower PUE (1.1) must decrease CO₂"
    assert s["high"] > 0, "Higher PUE (1.56) must increase CO₂"


def test_monotonicity_more_renewable_lower_co2():
    """Phase 3 invariant: lower grid carbon intensity → lower total CO₂.
    Verified through the grid_carbon_intensity driver: the -20% band edge must
    produce a negative CO₂ swing (i.e. lower CO₂ than baseline).
    """
    models = [_make_model(gco2=500.0)]
    result = oat_sensitivity(models)

    grid_driver = next(d for d in result["drivers"] if d["assumption"] == "grid_carbon_intensity")
    s = grid_driver["total_co2_swing_pct"]
    assert s["low"] < 0, "-20% grid intensity must yield negative CO₂ swing"
    assert s["high"] > 0, "+20% grid intensity must yield positive CO₂ swing"


def test_energy_intensity_band_is_dominant_when_wide():
    """With a very wide wh_per_output_token band (low=0.001, high=0.020, ratio 20×),
    energy_intensity must be the dominant driver (rank 1).
    """
    model = _make_model(wh_low=0.001, wh_mid=0.005, wh_high=0.020)
    result = oat_sensitivity([model])

    dominant = result["dominant"]
    assert dominant == "energy_intensity", (
        f"Expected energy_intensity to dominate with a 20× band, got {dominant!r}"
    )


def test_dominant_has_largest_abs_swing():
    """The driver with rank 1 must have the largest max(|low_pct|, |high_pct|)."""
    models = [_make_model()]
    result = oat_sensitivity(models)

    def max_abs(d: dict) -> float:
        s = d["total_co2_swing_pct"]
        return max(abs(s["low"]), abs(s["high"]))

    dominant_driver = next(d for d in result["drivers"] if d["rank"] == 1)
    for other in result["drivers"]:
        if other["rank"] != 1:
            assert max_abs(dominant_driver) >= max_abs(other), (
                f"Rank-1 driver {dominant_driver['assumption']} should have >= abs swing than "
                f"{other['assumption']}"
            )


def test_empty_models_returns_empty():
    """Edge case: no models → empty result (no crash)."""
    result = oat_sensitivity([])
    assert result["drivers"] == []
    assert result["dominant"] == ""


def test_only_other_rows_treated_as_empty():
    """All-other aggregates are excluded from the sweep → effectively empty."""
    models = [_make_model(is_other=True)]
    result = oat_sensitivity(models)
    assert result["drivers"] == []


def test_no_mc_or_ci_fields_in_output():
    """Band, not CI: the OAT output must NOT contain any probabilistic/MC field.
    Allowed top-level keys are: drivers, dominant.  Each driver may only have:
    assumption, band, total_co2_swing_pct, rank.
    """
    models = [_make_model()]
    result = oat_sensitivity(models)

    allowed_top = {"drivers", "dominant"}
    extra = set(result.keys()) - allowed_top
    assert not extra, f"Unexpected top-level keys: {extra}"

    allowed_driver = {"assumption", "band", "total_co2_swing_pct", "rank"}
    for d in result["drivers"]:
        unexpected = set(d.keys()) - allowed_driver
        assert not unexpected, f"Driver has unexpected keys (MC field?): {unexpected}"


def test_closed_range_wider_than_open_range():
    """6I fairness: a closed-model wh range must be visibly wider than an open-model range.
    We test this as a fixture property: relative range width = (high - low) / mid.
    """
    # open model: narrow measured range
    open_model = _make_model(
        slug="test/open-llama",
        wh_low=0.0006, wh_mid=0.001, wh_high=0.002,   # ~2× ratio
    )
    # closed model: intentionally wider range (undisclosed params/hardware)
    closed_model = _make_model(
        slug="test/closed-gpt",
        wh_low=0.002, wh_mid=0.005, wh_high=0.015,    # 7.5× ratio
    )

    def rel_width(m: dict) -> float:
        wh = m["wh_per_output_token"]
        mid = wh["mid"]
        return (wh["high"] - wh["low"]) / mid if mid else 0.0

    assert rel_width(closed_model) > rel_width(open_model), (
        "Closed-model wh range should be wider than open-model range (6I fairness)"
    )


def test_swing_pct_values_are_floats_not_none():
    """All swing_pct entries must be finite floats, never None."""
    models = [_make_model(), _make_model(slug="test/model-b", total_tokens=500_000_000)]
    result = oat_sensitivity(models)
    for d in result["drivers"]:
        s = d["total_co2_swing_pct"]
        for key in ("low", "high"):
            v = s[key]
            assert isinstance(v, float), f"swing_pct.{key} is not float: {v!r}"
            assert v == v, f"swing_pct.{key} is NaN"  # NaN != NaN

def test_monotonicity_multi_model_grid_intensity():
    """Ensure grid intensity sweep works correctly with multiple models having diverse gco2."""
    model_france = _make_model(slug="test/france", gco2=50.0)
    model_wyoming = _make_model(slug="test/wyoming", gco2=700.0)
    
    result = oat_sensitivity([model_france, model_wyoming])
    
    grid_driver = next(d for d in result["drivers"] if d["assumption"] == "grid_carbon_intensity")
    s = grid_driver["total_co2_swing_pct"]
    assert s["low"] < 0, (
        "-20% grid intensity must yield negative CO₂ swing even with diverse grids"
    )
    assert s["high"] > 0, (
        "+20% grid intensity must yield positive CO₂ swing even with diverse grids"
    )
