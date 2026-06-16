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
from pipeline.water import water_liters


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
