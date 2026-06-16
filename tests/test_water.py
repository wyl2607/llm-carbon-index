"""Tests for pipeline.water (on-site + off-site water split, W-WATER).

water_L = facility_energy_kWh * (onsite_WUE + offsite_EWIF), per Li et al.
"Making AI Less Thirsty" (arXiv:2304.03271). Range never collapses.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from pipeline.ranges import Range
from pipeline.water import _as_range, water_liters


def test_water_scalar_wue_sums_onsite_and_offsite():
    # 1000 kWh facility energy * (0.9 + 3.14) = 4040 L
    facility = Range(1000.0, 1000.0, 1000.0)
    w = water_liters(facility, 0.9, 3.14)
    assert w.mid == pytest.approx(4040.0)
    assert w.low == pytest.approx(4040.0)


def test_water_range_wue_widens_band():
    facility = Range(1000.0, 1000.0, 1000.0)
    onsite = Range(0.3, 0.9, 1.8)
    offsite = Range(2.0, 3.14, 4.35)
    w = water_liters(facility, onsite, offsite)
    # low: 1000*(0.3+2.0)=2300 ; mid: 1000*(0.9+3.14)=4040 ; high: 1000*(1.8+4.35)=6150
    assert w.low == pytest.approx(2300.0)
    assert w.mid == pytest.approx(4040.0)
    assert w.high == pytest.approx(6150.0)
    assert w.low <= w.mid <= w.high


def test_water_scales_with_facility_energy_range():
    facility = Range(100.0, 200.0, 400.0)
    w = water_liters(facility, 1.0, 3.0)  # total WUE 4.0
    assert w.low == pytest.approx(400.0)
    assert w.mid == pytest.approx(800.0)
    assert w.high == pytest.approx(1600.0)


# =============================================================================
# Direct unit tests for the private _as_range helper
# (extracted to module level to enable testing while remaining private)
# =============================================================================

def test_as_range_scalar_float_returns_degenerate_range():
    """Scalar float input must yield degenerate Range (low == mid == high == value)."""
    r = _as_range(0.9)
    assert isinstance(r, Range)
    assert r.low == pytest.approx(0.9)
    assert r.mid == pytest.approx(0.9)
    assert r.high == pytest.approx(0.9)
    assert r.low == r.mid == r.high


def test_as_range_scalar_int_returns_degenerate_range():
    """Scalar int is accepted and stored as float in the degenerate Range."""
    r = _as_range(3)
    assert r.low == r.mid == r.high == 3.0


def test_as_range_range_input_returns_same_object_identity():
    """When input is already Range, the original object is returned unchanged (by identity).

    We deliberately assert `is` (not just value equality) because the implementation
    does `return v`. This documents the intentional no-copy behavior for Range inputs
    and protects against accidental future allocation.
    """
    original = Range(0.3, 0.9, 1.8)
    result = _as_range(original)
    assert result is original
    assert result.low == pytest.approx(0.3)
    assert result.high == pytest.approx(1.8)


# Explicit coverage of all four (onsite_wue, offsite_ewif) type combinations
# through the public water_liters API. The scalar+scalar and Range+Range cases
# are already exercised by the original three tests; the two mixed cases below
# complete the matrix and go through the _as_range path.

def test_water_liters_mixed_scalar_onsite_range_offsite():
    """Scalar onsite + Range offsite → total becomes Range and widens conservatively."""
    facility = Range(1000.0, 1000.0, 1000.0)
    w = water_liters(facility, 0.9, Range(2.0, 3.14, 4.35))
    # total WUE = 0.9 + [2.0, 3.14, 4.35] = [2.9, 4.04, 5.25]
    assert w.low == pytest.approx(2900.0)
    assert w.mid == pytest.approx(4040.0)
    assert w.high == pytest.approx(5250.0)


def test_water_liters_mixed_range_onsite_scalar_offsite():
    """Range onsite + scalar offsite → total becomes Range and widens conservatively."""
    facility = Range(1000.0, 1000.0, 1000.0)
    w = water_liters(facility, Range(0.3, 0.9, 1.8), 3.14)
    # total WUE = [0.3, 0.9, 1.8] + 3.14 = [3.44, 4.04, 4.94]
    assert w.low == pytest.approx(3440.0)
    assert w.mid == pytest.approx(4040.0)
    assert w.high == pytest.approx(4940.0)


# Edge cases for _as_range (and implicitly for the WUE addition path)

def test_as_range_zero_value():
    """Zero is a valid (degenerate) input; produces exact zero Range."""
    r = _as_range(0.0)
    assert r.low == r.mid == r.high == 0.0


def test_as_range_large_value():
    """Large positive scalar (stress test for float handling in degenerate Range)."""
    big = 1_000_000_000.0
    r = _as_range(big)
    assert r.low == r.mid == r.high == big


def test_as_range_negative_value_converts():
    """_as_range performs conversion for any scalar (no sign guard here).

    Range.__init__ only enforces low <= mid <= high. Per ranges.py docstring
    and ASSUMPTIONS.md, real WUE/EWIF values are non-negative; negative input
    would be invalid data from upstream, but the helper itself should not crash.
    """
    r = _as_range(-0.5)
    assert r.low == r.mid == r.high == -0.5
