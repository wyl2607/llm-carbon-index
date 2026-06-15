"""Unit tests for pipeline.ranges.Range (ENGINEERING_STANDARDS §2 + §5).

Covers:
- Construction enforces low <= mid <= high
- Ops preserve invariant (for positive operands)
- scalar * , Range * Range (endpoint-wise)
- add
- / (Wh/kWh guard)
- *0 -> all zero
- to_dict matches RangeDict shape
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

# Make local pipeline package importable when running pytest from repo root
# (matches pattern used by Phase 0 tests/test_prove_math.py).
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from pipeline.ranges import Range
from pipeline.types import RangeDict


def test_range_ctor_enforces_order():
    r = Range(1, 2, 3)
    assert r.low == 1 and r.mid == 2 and r.high == 3
    with pytest.raises(ValueError):
        Range(3, 2, 1)
    with pytest.raises(ValueError):
        Range(1, 3, 2)


def test_range_to_dict():
    d: RangeDict = Range(0.1, 0.2, 0.3).to_dict()
    assert d == {"low": 0.1, "mid": 0.2, "high": 0.3}
    assert list(d.keys()) == ["low", "mid", "high"]  # order not strictly required but shape exact


def test_scalar_multiply_and_div():
    r = Range(2, 4, 8)
    r2 = r * 1.5
    assert r2.low == 3 and r2.mid == 6 and r2.high == 12
    assert (0.5 * r).mid == 2.0
    kwh = r / 1000.0
    assert kwh.low == 0.002 and kwh.high == 0.008


def test_range_multiply_endpoint_wise():
    a = Range(1, 2, 3)
    b = Range(10, 20, 30)
    c = a * b
    assert c.low == 10 and c.mid == 40 and c.high == 90


def test_add_ranges():
    a = Range(1, 2, 3)
    b = Range(4, 5, 6)
    c = a + b
    assert c.low == 5 and c.mid == 7 and c.high == 9


def test_zero_scaling():
    r = Range(0.5, 1.0, 2.0)
    z = r * 0
    assert z.low == 0 and z.mid == 0 and z.high == 0
    z2 = Range(10, 20, 30) * 0.0
    assert z2.high == 0


def test_invariant_after_all_ops():
    r = Range(0.0005, 0.0012, 0.0025)
    for _ in range(3):
        r = r * 1.2
        r = r * Range(1, 1, 1)
        r = r + Range(0, 0, 0)
        r = r / 2
    assert r.low <= r.mid <= r.high


def test_negative_scalar_rejected_by_semantics_but_ctor_only():
    # We do not support negative in model domain; ctor still enforces order
    # (negative scalar would reverse low/high which we treat as misuse)
    # Here just ensure no crash on positive path only.
    r = Range(1, 2, 3) * 2
    assert r.high == 6
