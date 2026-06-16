"""CO2 computation from energy + grid + PUE. Pure math, no I/O.

Phase 6n: embodied now has TWO estimators:
- #1 ratio-proxy (existing embodied_co2_kg, kept unchanged for callers)
- #2 physical LLMCarbon-style (in pipeline.embodied.physical_embodied_co2_kg)

carbon.py calls both via helpers and exposes spread (|physical - proxy|) as
embodied method-uncertainty. Operational CO2 path untouched.
"""

from __future__ import annotations

from typing import Union

from pipeline.embodied import physical_embodied_co2_kg as _physical_embodied_impl
from pipeline.ranges import Range


def co2_kg(energy: Range, gco2_per_kwh: float, pue: Union[float, Range]) -> Range:
    """Compute operational CO2 (kg) as energy_kWh * PUE * gCO2/kWh / 1000.

    The final /1000 converts (kWh * g/kWh) -> kg.
    All inputs positive; output is a Range (never collapses).

    `pue` may be a scalar OR a Range (ASSUMPTIONS.md#A4 revised to a band): when a
    Range, `energy * pue` multiplies endpoint-wise, conservatively widening the
    band. `gco2_per_kwh` is a scalar (from grid.py).
    """
    # Apply PUE to the (IT) energy to get facility energy, then grid factor.
    # energy (kWh) * pue * gco2 (g/kWh) / 1000 = kg CO2eq
    after_pue = energy * pue
    after_grid = after_pue * gco2_per_kwh
    return after_grid / 1000.0


def embodied_co2_kg(operational_co2: Range, embodied_ratio: Union[float, Range]) -> Range:
    """Amortised embodied (hardware manufacturing) CO2 (kg) — RATIO PROXY (#1).

    Modelled as a fraction of operational CO2 (ASSUMPTIONS.md#C-EMBODIED): embodied
    is ~22-35% of total LLM carbon, i.e. share/(1-share) of operational. A Range
    ratio widens the band endpoint-wise.

    This is the original proxy estimator. See physical_embodied_co2_kg (via
    compute_embodied_spread etc) for the second physically-grounded estimator.
    """
    return operational_co2 * embodied_ratio


def total_lca_co2_kg(operational_co2: Range, embodied_co2: Range) -> Range:
    """Full-lifecycle CO2 (kg) = operational + embodied (endpoint-wise sum)."""
    return operational_co2 + embodied_co2


# --- Phase 6n: both embodied estimators + method spread ---

def compute_embodied_spread(
    operational_co2: Range,
    embodied_ratio: Union[float, Range],
    energy_kwh: Range,
    gpu_class_id: str = "A100-80GB",
) -> dict:
    """Call BOTH embodied estimators and expose results + spread.

    proxy: the kept ratio-of-op proxy (estimator #1)
    physical: LLMCarbon-style die*CPA amortised (estimator #2, from embodied.py)
    spread: |physical.mid - proxy.mid| (method uncertainty scalar)
    physical_range: the Range from physical
    proxy_range: the Range from proxy
    """
    proxy = embodied_co2_kg(operational_co2, embodied_ratio)
    phys = _physical_embodied_impl(energy_kwh, gpu_class_id=gpu_class_id)
    spread = abs(phys.mid - proxy.mid)
    return {
        "proxy": proxy,
        "physical": phys,
        "spread": spread,
        "proxy_range": proxy,
        "physical_range": phys,
    }


def physical_embodied_co2_kg(  # re-export for convenience; real impl in embodied.py
    energy_kwh: Range,
    gpu_class_id: str = "A100-80GB",
) -> Range:
    """Re-export of the physical embodied estimator (LLMCarbon-style #2).

    Delegates to pipeline.embodied (with yaml load + SKIP-on-fail).
    """
    return _physical_embodied_impl(energy_kwh, gpu_class_id=gpu_class_id)
