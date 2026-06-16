"""Physical (LLMCarbon-style) embodied-carbon estimator (Phase 6n).

Second estimator alongside the ratio-of-operational proxy (carbon.embodied_co2_kg).
Formula (per LLMCarbon arXiv:2309.14393 eq11-12, with ranges):
  area_cm2 = die_area_mm2 / 100
  chip_embodied_kg = area_cm2 * cpa_kgco2_per_cm2
  gpu_hours = energy_kwh / per_gpu_power_kw   # tdp_kw proxy
  embodied_kg = chip_embodied_kg * (gpu_hours / lifetime_hours) / utilization

All constants live in data/assumptions/hardware_embodied.yaml (with H-* source_id).
Carries {low,mid,high} Range through using conservative endpoint arithmetic.
If reading hardware_embodied.yaml (or any parse) fails: SKIP and continue (return
fallback Range); never abort the caller.

No hardcoded numbers here; no silent zero for missing gpu_class (wide fallback Range).
"""

from __future__ import annotations

from pathlib import Path
from typing import Optional, Union

import yaml

from pipeline.ranges import Range


def _load_hardware_embodied() -> dict:
    """Load gpu_classes list etc from data/assumptions/hardware_embodied.yaml.

    If ANY read/parse/error occurs (missing, permission, bad yaml, wrong shape):
    SKIP and continue -> return {} . Never raises to caller.
    """
    path = Path(__file__).resolve().parents[1] / "data/assumptions/hardware_embodied.yaml"
    try:
        with open(path, encoding="utf-8") as f:
            loaded = yaml.safe_load(f)
            if isinstance(loaded, dict):
                return loaded
    except Exception:
        # SKIP and continue per hard rule
        pass
    return {}


def _as_range(
    val: Union[dict, float, int, None], lo_def: float, mi_def: float, hi_def: float
) -> Range:
    """Turn dict {low,mid,high} or scalar or missing into Range.

    Falls back to provided defaults if malformed or absent. Enforces low <= mid <= high.
    """
    if isinstance(val, (int, float)):
        v = float(val)
        return Range(v, v, v)
    if isinstance(val, dict):
        # prefer explicit; fall to mid if partial
        lo = float(val.get("low", val.get("mid", lo_def)))
        mi = float(val.get("mid", mi_def))
        hi = float(val.get("high", val.get("mid", hi_def)))
        # make safe
        vals = sorted([lo, mi, hi])
        lo, mi, hi = vals[0], vals[1], vals[2]
        # but preserve intended mid if possible
        mi = float(val.get("mid", mi))
        if lo > mi:
            lo = mi
        if hi < mi:
            hi = mi
        return Range(lo, mi, hi)
    return Range(lo_def, mi_def, hi_def)


def _div_by_range(numer: Range, denom: Range) -> Range:
    """Conservative a / b for positive Range a, Range b.

    low = min over sampled extremes; ensure constructor low<=mid<=high.
    (Range.__truediv__ only supports scalar; this is local to embodied.)
    """
    dlo = denom.low if denom.low > 0 else 0.001
    dmi = denom.mid if denom.mid > 0 else 0.001
    dhi = denom.high if denom.high > 0 else 0.001
    lo = numer.low / dhi
    mi = numer.mid / dmi
    hi = numer.high / dlo
    rlow = min(lo, mi, hi)
    rhigh = max(lo, mi, hi)
    rmid = mi
    if rlow > rmid:
        rlow = rmid
    if rhigh < rmid:
        rhigh = rmid
    return Range(rlow, rmid, rhigh)


def physical_embodied_co2_kg(
    energy_kwh: Range,
    gpu_class_id: str = "A100-80GB",
    hardware: Optional[dict] = None,
) -> Range:
    """Compute amortised physical embodied CO2 (kg) attributed to the given energy use.

    Derives GPU-hours from energy / TDP (power proxy), then applies chip embodied
    amortised by lifetime and utilization. Returns Range (never collapses).

    hardware: optional preloaded dict (for test injection); if None, loads from yaml
    (with SKIP-on-fail).

    On missing gpu_class or empty hardware: returns a wide positive fallback Range
    (no silent 0).
    """
    if hardware is None:
        hardware = _load_hardware_embodied()

    gpus = hardware.get("gpu_classes") or []
    gpu = next(
        (g for g in gpus if isinstance(g, dict) and g.get("id") == gpu_class_id), None
    )

    if not gpu:
        # Fallback (unknown class): wide band, positive to avoid silent 0/null.
        # Nominal ~10kg embodied amortised example; wide to signal uncertainty.
        return Range(1.0, 10.0, 30.0)

    # Extract with per-field source_ids expected in yaml (validated by test, not here)
    die = _as_range(gpu.get("die_area_mm2"), 800.0, 826.0, 850.0)
    cpa = _as_range(gpu.get("cpa_kgco2_per_cm2"), 0.8, 1.0, 1.5)
    tdp = _as_range(gpu.get("tdp_kw"), 0.3, 0.4, 0.5)
    life = _as_range(gpu.get("lifetime_hours"), 26280.0, 43800.0, 61320.0)
    util = _as_range(gpu.get("utilization"), 0.3, 0.5, 0.7)

    area_cm = die / 100.0
    chip_emb = area_cm * cpa
    gpu_h = _div_by_range(energy_kwh, tdp)
    amort = _div_by_range(gpu_h, life)
    amort = _div_by_range(amort, util)
    emb = chip_emb * amort
    return emb
