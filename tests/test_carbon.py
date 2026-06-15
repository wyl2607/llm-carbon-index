"""Tests for pipeline.carbon (CO2 from energy + grid + PUE).

ENGINEERING_STANDARDS §5 requires:
- g <-> kg conversion guards on known inputs
- Range never collapses
- hand-computed match for energy_kwh * pue * gco2 /1000
"""

from __future__ import annotations

import sys
from pathlib import Path

# Make local pipeline package importable when running pytest from repo root
# (matches pattern used by Phase 0 tests/test_prove_math.py).
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from pipeline.carbon import co2_kg
from pipeline.ranges import Range


def test_co2_kg_basic_conversion_and_units():
    # 2 kWh * 1.0 PUE * 500 g/kWh / 1000 = 1.0 kg
    e = Range(2.0, 2.0, 2.0)
    c = co2_kg(e, 500.0, 1.0)
    assert c.low == 1.0 and c.mid == 1.0 and c.high == 1.0


def test_co2_kg_applies_pue_and_div1000():
    # energy 1000 kWh, pue 1.2, 400 g -> 1000*1.2*400 /1000 = 480 kg
    e = Range(1000.0, 1000.0, 1000.0)
    c = co2_kg(e, 400.0, 1.2)
    assert abs(c.mid - 480.0) < 1e-9
    assert c.low <= c.mid <= c.high


def test_co2_kg_range_propagates():
    e = Range(100.0, 200.0, 400.0)
    c = co2_kg(e, 380.0, 1.2)
    # 100*1.2*380/1000 = 45.6 ; 200*...=91.2 ; 400*...=182.4
    assert abs(c.low - 45.6) < 0.01
    assert abs(c.mid - 91.2) < 0.01
    assert abs(c.high - 182.4) < 0.01
    assert c.low <= c.mid <= c.high


def test_co2_kg_g_to_kg_guard_on_known():
    # 1 kWh * 1 * 1000 g/kWh /1000 = 1 kg
    c = co2_kg(Range(1, 1, 1), 1000.0, 1.0)
    assert c.mid == 1.0
    # 0.5 kWh * 2 * 1000 /1000 = 1 kg
    c2 = co2_kg(Range(0.5, 0.5, 0.5), 1000.0, 2.0)
    assert c2.mid == 1.0
