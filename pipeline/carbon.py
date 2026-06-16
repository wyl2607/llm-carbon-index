"""CO2 computation from energy + grid + PUE. Pure math, no I/O."""

from __future__ import annotations

from typing import Union

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
    """Amortised embodied (hardware manufacturing) CO2 (kg).

    Modelled as a fraction of operational CO2 (ASSUMPTIONS.md#C-EMBODIED): embodied
    is ~22-35% of total LLM carbon, i.e. share/(1-share) of operational. A Range
    ratio widens the band endpoint-wise.
    """
    return operational_co2 * embodied_ratio


def total_lca_co2_kg(operational_co2: Range, embodied_co2: Range) -> Range:
    """Full-lifecycle CO2 (kg) = operational + embodied (endpoint-wise sum)."""
    return operational_co2 + embodied_co2
