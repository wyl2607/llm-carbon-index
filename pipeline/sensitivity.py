"""Phase 6K: one-at-a-time (OAT) sensitivity analysis over key assumptions.

Sweeps each assumption across its documented plausible band (one at a time,
all others at their nominal/mid value) and reports the resulting swing in
total CO₂ as a percentage of the baseline mid.  Identifies the dominant
uncertainty driver — the assumption whose sweep produces the largest co2 swing.

Pure functions, no I/O.  Callers (build_outputs) supply model estimates and
load the produced sensitivity.json.

Assumptions swept (per ASSUMPTIONS.md):
  - A2: input:output ratio (io_ratio)  — 80:20 baseline; range 70:30 to 90:10
  - A4: PUE band scalar               — mid 1.25; low 1.1 / high 1.56
  - grid: carbon_intensity_gco2_kwh   — ±20% on the weighted-average grid factor
  - energy_intensity: wh_per_output_token — low/high endpoints of each model's Range

Each driver's swing is expressed relative to the baseline total CO₂ mid:
  swing_pct_low  = (alt_co2_low_end  - baseline_mid) / baseline_mid * 100
  swing_pct_high = (alt_co2_high_end - baseline_mid) / baseline_mid * 100
"""

from __future__ import annotations

from pipeline.carbon import co2_kg as compute_co2_kg
from pipeline.energy import energy_kwh
from pipeline.ranges import Range
from pipeline.tokens import input_tokens, output_tokens

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _parse_io_ratio(ratio_str: str) -> float:
    """Parse 'I:O' string (e.g. '70:30') to output fraction."""
    left, right = ratio_str.split(":")
    i, o = float(left), float(right)
    return o / (i + o)


def _total_co2_baseline(models: list[dict]) -> float:
    """Recompute total CO₂ mid at baseline assumptions (output_frac=0.20 default).

    Uses _sum_co2 with no overrides so the baseline is derived identically to
    the alt sweeps — no dependence on the pre-computed co2_kg field in the model dict.
    """
    return _sum_co2(models)


def _model_co2_under(
    m: dict,
    output_frac: float | None = None,
    pue_scalar: float | None = None,
    gco2_scalar: float | None = None,
    wh_endpoint: str | None = None,  # "low" | "high" | None
) -> float:
    """Re-derive one model's operational co2_kg.mid under altered assumptions.

    Only the swept assumption is changed; everything else stays at its nominal
    (mid) value.  Returns the mid-point CO₂ so we can sum across models for
    a total.

    wh_endpoint: when not None, use the model's wh_per_output_token low or high
    endpoint (instead of mid) to measure the energy-intensity sensitivity.
    """
    total_tok = int(m.get("total_tokens", 0))
    if total_tok <= 0:
        return 0.0

    # --- output / input token split -----------------------------------------
    if output_frac is not None:
        out_tok = output_tokens(total_tok, output_frac)
    else:
        out_tok = int(m.get("est_output_tokens", 0))
    in_tok = input_tokens(total_tok, out_tok)

    # --- energy intensity ---------------------------------------------------
    wh_d = m.get("wh_per_output_token", {})
    if wh_endpoint:
        wh_v = float(wh_d.get(wh_endpoint, wh_d.get("mid", 0.005)))
    else:
        wh_v = float(wh_d.get("mid", 0.005))
    wh = Range(wh_v, wh_v, wh_v)   # scalar wrapped as degenerate Range

    # prefill alpha kept at documented mid (0.2) for all non-energy sweeps
    prefill_alpha = Range(0.2, 0.2, 0.2)
    kwh = energy_kwh(wh, out_tok, in_tok, prefill_alpha)

    # --- PUE ----------------------------------------------------------------
    pue_v = float(pue_scalar) if pue_scalar is not None else float(m.get("pue", 1.25))
    pue = Range(pue_v, pue_v, pue_v)

    # --- grid intensity -----------------------------------------------------
    gco2 = float(m.get("carbon_intensity_gco2_kwh", 400.0))
    if gco2_scalar is not None:
        gco2 *= float(gco2_scalar)

    co2 = compute_co2_kg(kwh, gco2, pue)
    return co2.mid


def _sum_co2(models: list[dict], **kwargs: object) -> float:
    """Sum _model_co2_under across all non-other modeled rows."""
    return sum(
        _model_co2_under(m, **kwargs)  # type: ignore[arg-type]
        for m in models
        if not m.get("is_other")
    )



# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def oat_sensitivity(models: list[dict]) -> dict:
    """One-at-a-time sensitivity sweep over the four key assumptions.

    models: list of ModelEstimate-like dicts (from build_output / latest.json
            "models" array).  Must supply at minimum:
              slug, total_tokens, est_output_tokens, wh_per_output_token (Range dict),
              co2_kg (Range dict), carbon_intensity_gco2_kwh, pue.

    Returns a dict matching DATA_SCHEMAS.md §8:
    {
      "drivers": [
        {"assumption": "...", "band": [low_label, high_label],
         "total_co2_swing_pct": {"low": -N, "high": +M}, "rank": 1}
        ...
      ],
      "dominant": "<assumption name>"
    }

    Drivers are ranked by the *maximum absolute swing* (max of |low_pct|, |high_pct|),
    so the dominant driver is the one whose sweep moves total CO₂ the furthest from
    the baseline mid.
    """
    modeled = [m for m in models if not m.get("is_other")]
    if not modeled:
        return {"drivers": [], "dominant": ""}

    baseline_mid = _total_co2_baseline(modeled)
    if baseline_mid == 0.0:
        return {"drivers": [], "dominant": ""}

    def _swing_pct(alt: float) -> float:
        return (alt - baseline_mid) / baseline_mid * 100.0

    drivers: list[dict] = []

    # --- A2: input:output ratio -----------------------------------------------
    # Baseline 80:20 (output_frac=0.20). Band: 70:30 (more output tokens) to
    # 90:10 (fewer output tokens). More output → more energy → higher CO₂.
    co2_70_30 = _sum_co2(modeled, output_frac=0.30)
    co2_90_10 = _sum_co2(modeled, output_frac=0.10)
    low_pct_io = _swing_pct(min(co2_70_30, co2_90_10))
    high_pct_io = _swing_pct(max(co2_70_30, co2_90_10))
    drivers.append({
        "assumption": "input_output_ratio",
        "band": ["70:30", "90:10"],
        "total_co2_swing_pct": {"low": round(low_pct_io, 1), "high": round(high_pct_io, 1)},
    })

    # --- A4: PUE --------------------------------------------------------------
    # Baseline mid 1.25. Band: low 1.1 / high 1.56.
    co2_pue_low = _sum_co2(modeled, pue_scalar=1.1)
    co2_pue_high = _sum_co2(modeled, pue_scalar=1.56)
    low_pct_pue = _swing_pct(co2_pue_low)
    high_pct_pue = _swing_pct(co2_pue_high)
    drivers.append({
        "assumption": "pue",
        "band": ["1.1", "1.56"],
        "total_co2_swing_pct": {"low": round(low_pct_pue, 1), "high": round(high_pct_pue, 1)},
    })

    # --- Grid carbon intensity ------------------------------------------------
    # Sweep ±20% on each model's grid factor (a realistic data-center
    # location uncertainty; also covers Electricity Maps live vs annual-factor gap).
    co2_grid_low = _sum_co2(modeled, gco2_scalar=0.80)
    co2_grid_high = _sum_co2(modeled, gco2_scalar=1.20)
    low_pct_grid = _swing_pct(co2_grid_low)
    high_pct_grid = _swing_pct(co2_grid_high)
    drivers.append({
        "assumption": "grid_carbon_intensity",
        "band": ["-20% of weighted avg", "+20% of weighted avg"],
        "total_co2_swing_pct": {"low": round(low_pct_grid, 1), "high": round(high_pct_grid, 1)},
    })

    # --- Energy intensity (wh_per_output_token) --------------------------------
    # Use each model's own low/high endpoint (the documented fallback/measured band),
    # keeping all else at mid. This captures the dominant Range source for all-fallback data.
    co2_wh_low = _sum_co2(modeled, wh_endpoint="low")
    co2_wh_high = _sum_co2(modeled, wh_endpoint="high")
    low_pct_wh = _swing_pct(co2_wh_low)
    high_pct_wh = _swing_pct(co2_wh_high)
    drivers.append({
        "assumption": "energy_intensity",
        "band": ["wh_per_output_token.low", "wh_per_output_token.high"],
        "total_co2_swing_pct": {"low": round(low_pct_wh, 1), "high": round(high_pct_wh, 1)},
    })

    # --- Rank by max absolute swing ------------------------------------------
    def _max_abs(d: dict) -> float:
        s = d["total_co2_swing_pct"]
        return max(abs(s["low"]), abs(s["high"]))

    drivers.sort(key=_max_abs, reverse=True)
    for i, d in enumerate(drivers):
        d["rank"] = i + 1

    dominant = drivers[0]["assumption"] if drivers else ""

    return {"drivers": drivers, "dominant": dominant}
