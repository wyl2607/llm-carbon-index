"""Phase 6F: estimation-tier honesty — aggregate per-model precision flags.

Pure functions over the published per-model records (DATA_SCHEMAS §1 `models[]`).
They add **no new sourced numbers**: they only report what the existing
`energy_source` / `grid_source` labels already imply, so they carry zero
fabrication risk (CLAUDE.md scope statement reinforced, not weakened).

`precision_fractions` is **token-weighted by `total_tokens`** — consistent with
`totals.modeled_traffic_fraction` — and computed over the modeled records only
(the caller passes the estimates list, which already excludes the OpenRouter
`other`/uncovered aggregate). Each axis sums to 1.0 (± float tolerance).
"""
from __future__ import annotations

from collections.abc import Iterable

from pipeline.types import ModelEstimate

# energy_source values that count as a real measurement vs a parameter-class guess.
# (DATA_SCHEMAS §1: energy_source ∈ ai_energy_score | ecologits | parameter_class_fallback)
_MEASURED_ENERGY_SOURCES = ("ai_energy_score", "ecologits")
# grid_source values (DATA_SCHEMAS §1: grid_source ∈ electricity_maps_live | annual_factor)
_LIVE_GRID_SOURCE = "electricity_maps_live"


def energy_tier(model: ModelEstimate) -> str:
    """Map a model's energy_source to its precision tier.

    Returns "measured" for ai_energy_score / ecologits, else "class_fallback".
    """
    if model.get("energy_source") in _MEASURED_ENERGY_SOURCES:
        return "measured"
    return "class_fallback"


def grid_tier(model: ModelEstimate) -> str:
    """Map a model's grid_source to its precision tier.

    Returns "live" for electricity_maps_live, else "annual_fallback".
    """
    return "live" if model.get("grid_source") == _LIVE_GRID_SOURCE else "annual_fallback"


def precision_fractions(models: Iterable[ModelEstimate]) -> dict:
    """Token-weighted precision fractions over the modeled records.

    Weighted by `total_tokens` (not model count) so the figure reflects how much
    of the *published traffic* rests on measured vs fallback inputs. Each axis
    sums to 1.0. When there are no modeled tokens, the honest default is the
    all-fallback state (measured/live = 0.0).
    """
    total = 0
    energy_measured = 0
    grid_live = 0
    for m in models:
        tok = int(m.get("total_tokens", 0))
        total += tok
        if energy_tier(m) == "measured":
            energy_measured += tok
        if grid_tier(m) == "live":
            grid_live += tok

    if total <= 0:
        energy_measured_fraction = 0.0
        grid_live_fraction = 0.0
    else:
        energy_measured_fraction = energy_measured / total
        grid_live_fraction = grid_live / total

    return {
        "energy_measured_fraction": energy_measured_fraction,
        "energy_class_fallback_fraction": 1.0 - energy_measured_fraction,
        "grid_live_fraction": grid_live_fraction,
        "grid_annual_fallback_fraction": 1.0 - grid_live_fraction,
    }
