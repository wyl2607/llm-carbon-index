"""Water footprint (L) from facility energy. Pure math, no I/O.

Replaces the flat single-WUE model with an on-site + off-site split
(ASSUMPTIONS.md#W-WATER), per Li et al. "Making AI Less Thirsty"
(arXiv:2304.03271):

    water_L = facility_energy_kWh * (onsite_WUE + offsite_EWIF)

- on-site WUE: water evaporated by data-centre cooling, per kWh of facility energy.
- off-site EWIF: water evaporated generating that electricity, per kWh.

Both scale with FACILITY energy (IT energy * PUE), so callers pass facility energy.
"""

from __future__ import annotations

from typing import Union

from pipeline.ranges import Range


def water_liters(
    facility_energy_kwh: Range,
    onsite_wue: Union[float, Range],
    offsite_ewif: Union[float, Range],
) -> Range:
    """Total water (L) = facility_energy * (onsite_WUE + offsite_EWIF).

    WUE terms may be scalars or Ranges; a Range total WUE widens the band
    endpoint-wise (conservative).
    """
    if isinstance(onsite_wue, Range) or isinstance(offsite_ewif, Range):
        on = onsite_wue if isinstance(onsite_wue, Range) else Range(onsite_wue, onsite_wue, onsite_wue)
        off = offsite_ewif if isinstance(offsite_ewif, Range) else Range(offsite_ewif, offsite_ewif, offsite_ewif)
        total_wue: Union[float, Range] = on + off
    else:
        total_wue = onsite_wue + offsite_ewif
    return facility_energy_kwh * total_wue
