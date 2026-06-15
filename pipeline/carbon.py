"""CO2 computation from energy + grid + PUE. Pure math, no I/O."""

from __future__ import annotations

from pipeline.ranges import Range


def co2_kg(energy: Range, gco2_per_kwh: float, pue: float) -> Range:
    """Compute CO2 (kg) as energy_kWh * PUE * gCO2/kWh / 1000.

    The final /1000 converts (kWh * g/kWh) -> kg.
    All inputs positive; output is a Range (never collapses).

    PUE and gco2_per_kwh are scalars (pue from closed_models or default 1.2 per A4;
    gco2 from grid.py).
    """
    # Apply PUE to the (IT) energy to get facility energy, then grid factor.
    # energy (kWh) * pue * gco2 (g/kWh) / 1000 = kg CO2eq
    after_pue = energy * pue
    after_grid = after_pue * gco2_per_kwh
    return after_grid / 1000.0
