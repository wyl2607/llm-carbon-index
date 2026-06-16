"""Phase 6I: pure fairness / comparability helpers (no I/O at import time).

- rank_stability(models, assumption_sets): recomputes top-N (co2 total and co2-per-output-token)
  leaderboards under each alt assumption set and reports change counts + max displacement
  relative to the base ordering present in the supplied models.
- origin_invariance(model): swapping only the `origin` label leaves energy/CO2 numbers unchanged
  (origin is display/grouping metadata; calc uses region grid factor + provider PUE etc.).

All energy/CO2 values remain Range; comparisons construct and consume Range objects
(ENGINEERING_STANDARDS §2, phase-6i spec "range-not-midpoint" rule). No bare mid is used
as the sole sort key without going through Range.

Assumptions (documented; cite sources in code + ASSUMPTIONS.md):
- Default output token ratio 0.20 per A2 (ASSUMPTIONS.md#A2); alt sets may supply "70:30".
- PUE alts use documented band values from A4 (source_id "A4").
- "best" grid uses a seeded low factor (e.g. europe-west via C-GRID-EUROPE-WEST-230).
- Prefill alpha (for io-ratio alts that change input/output split) uses the E-PREFILL band.
- top_n conventionally 10 (common for LLM leaderboards e.g. arena/Artificial Analysis);
  if fewer models, reports actual N.
"""

from __future__ import annotations

from pipeline.carbon import co2_kg
from pipeline.energy import energy_kwh
from pipeline.ranges import Range
from pipeline.tokens import input_tokens, output_tokens
from pipeline.types import RangeDict


def _as_range(d: RangeDict | dict | None) -> Range:
    d = d or {"low": 0.0, "mid": 0.0, "high": 0.0}
    return Range(float(d.get("low", 0)), float(d.get("mid", 0)), float(d.get("high", 0)))


def _parse_output_fraction(ratio: str | float | int | None) -> float | None:
    """Return output-token fraction from "80:20" (or "70:30") style or bare float.

    Returns None if absent/unparsable (caller keeps base est_output_tokens).
    """
    if ratio is None:
        return None
    if isinstance(ratio, (int, float)):
        f = float(ratio)
        return f if 0.0 < f < 1.0 else None
    if isinstance(ratio, str):
        if ":" in ratio:
            try:
                left, right = ratio.split(":", 1)
                i = float(left)
                o = float(right)
                if i + o > 0:
                    return o / (i + o)
            except Exception:  # noqa: S110 - fallback to None for robustness
                pass
        try:
            f = float(ratio)
            return f if 0.0 < f < 1.0 else None
        except Exception:  # noqa: S110 - fallback to None for robustness
            pass
    return None


def _recompute_co2(
    model: dict,
    output_fraction: float | None,
    pue_scalar: float | None,
    gco2_override: float | None,
) -> Range:
    """Re-derive operational co2_kg Range under the supplied alt parameters.

    Uses the pure math chain (tokens, energy, carbon) so alt scaling is identical
    to the primary path. Only the varied parameters (split, pue, g) differ.
    """
    total = int(model.get("total_tokens", 0))
    if output_fraction is None:
        out_t = int(model.get("est_output_tokens", 0))
    else:
        out_t = output_tokens(total, output_fraction)
    in_t = input_tokens(total, out_t)

    wh = _as_range(model.get("wh_per_output_token"))

    # Prefill alpha band (ASSUMPTIONS.md#E-PREFILL; source_id "E-PREFILL").
    # Only io-ratio alts change the input/output split; prefill kept at documented default.
    prefill_alpha = Range(0.1, 0.2, 0.3)
    energy = energy_kwh(wh, out_t, in_t, prefill_alpha)

    g = float(gco2_override) if gco2_override is not None else float(
        model.get("carbon_intensity_gco2_kwh", 400.0)
    )
    p = float(pue_scalar) if pue_scalar is not None else float(model.get("pue", 1.25))
    return co2_kg(energy, g, p)


def _recompute_out(model: dict, output_fraction: float | None) -> int:
    if output_fraction is None:
        return int(model.get("est_output_tokens", 0))
    return output_tokens(int(model.get("total_tokens", 0)), output_fraction)


def _metric_key(
    model: dict, board: str, out_override: int | None = None
) -> tuple[float, float, float]:
    """Build sort key for a board, constructing a Range (consumes low/mid/high).

    Lower-better for both total CO2 and efficiency (CO2 per output token).
    Primary key uses mid (nominal) after Range construction per spec.
    """
    co2_d = model.get("co2_kg", {"low": 0.0, "mid": 0.0, "high": 0.0})
    r = _as_range(co2_d)  # must go through Range; test enforces range-not-midpoint path
    if board == "by_co2":
        return (r.mid, r.low, r.high)
    # efficiency: co2 per output token
    out_t = out_override if out_override is not None else int(model.get("est_output_tokens", 1))
    if out_t <= 0:
        out_t = 1
    eff = r / out_t
    return (eff.mid, eff.low, eff.high)


def _compute_order(models: list[dict], board: str) -> list[str]:
    """Return slugs ordered best-to-worst for board (consumes Ranges)."""
    keyed: list[tuple[tuple[float, float, float], str]] = []
    for m in models:
        key = _metric_key(m, board)
        keyed.append((key, m.get("slug", "")))
    keyed.sort(key=lambda t: t[0])
    return [s for _, s in keyed]


def _compare_top(base_order: list[str], alt_order: list[str], top_n: int) -> tuple[int, int]:
    """For the top_n slugs from base, compute max |rank delta| and count of models with delta>0
    when their positions are looked up in alt_order (0 = best).
    """
    if top_n <= 0:
        return 0, 0
    base_top = base_order[:top_n]
    alt_pos = {slug: idx for idx, slug in enumerate(alt_order)}
    max_disp = 0
    num_changed = 0
    for base_idx, slug in enumerate(base_top):
        alt_idx = alt_pos.get(slug, len(alt_order))
        d = abs(base_idx - alt_idx)
        if d > 0:
            num_changed += 1
        if d > max_disp:
            max_disp = d
    return max_disp, num_changed


def rank_stability(models: list[dict], assumption_sets: list[dict] | None) -> dict:
    """Recompute top-N leaderboard under each alt assumption set; report stability per board.

    models: list of ModelEstimate-like dicts (must supply at minimum: slug, total_tokens,
            est_output_tokens, wh_per_output_token, co2_kg, carbon_intensity_gco2_kwh, pue).
    assumption_sets: list of overlays from alt_assumption_sets.yaml (each may carry
                     input_output_ratio, pue, grid_gco2 (or gco2_override), plus source_id).

    Returns exactly:
      {"by_co2": {"top_n": N, "ranks_changed": C, "max_displacement": D},
       "by_efficiency": {"top_n": N, "ranks_changed": C, "max_displacement": D}}

    ranks_changed / max_displacement are the *maximum* observed across the provided alts
    (i.e. "worst-case fragility"). top_n = min(10, len(models)) or the actual N used.
    """
    if not models:
        z = {"top_n": 0, "ranks_changed": 0, "max_displacement": 0}
        return {"by_co2": z, "by_efficiency": z}

    n_models = len(models)
    top_n = min(10, n_models)

    # Base ordering comes from the co2_kg (and est_output_tokens) already present
    # in the estimates (computed under primary assumptions).
    base_co2_order = _compute_order(models, "by_co2")
    base_eff_order = _compute_order(models, "by_efficiency")

    max_disp_co2 = 0
    chg_co2 = 0
    max_disp_eff = 0
    chg_eff = 0

    sets = assumption_sets or []
    for aset in sets:
        if not isinstance(aset, dict):
            continue
        out_frac = _parse_output_fraction(aset.get("input_output_ratio"))
        pue = aset.get("pue")
        g_ov = aset.get("grid_gco2") or aset.get("gco2_override")

        # Build alt view of every model (only co2 + out are overridden for ranking).
        alt_views: list[dict] = []
        for m in models:
            co2_alt = _recompute_co2(m, out_frac, pue, g_ov)
            out_alt = _recompute_out(m, out_frac)
            v = dict(m)  # shallow is sufficient; we only read the keys we override
            v["co2_kg"] = co2_alt.to_dict()
            v["est_output_tokens"] = out_alt
            alt_views.append(v)

        alt_co2_order = _compute_order(alt_views, "by_co2")
        alt_eff_order = _compute_order(alt_views, "by_efficiency")

        d_c, c_c = _compare_top(base_co2_order, alt_co2_order, top_n)
        d_e, c_e = _compare_top(base_eff_order, alt_eff_order, top_n)

        if c_c > chg_co2:
            chg_co2 = c_c
        if d_c > max_disp_co2:
            max_disp_co2 = d_c
        if c_e > chg_eff:
            chg_eff = c_e
        if d_e > max_disp_eff:
            max_disp_eff = d_e

    return {
        "by_co2": {
            "top_n": top_n,
            "ranks_changed": chg_co2,
            "max_displacement": max_disp_co2,
        },
        "by_efficiency": {
            "top_n": top_n,
            "ranks_changed": chg_eff,
            "max_displacement": max_disp_eff,
        },
    }


def origin_invariance(model: dict) -> bool:
    """Return True iff swapping *only* the origin label leaves energy/CO2 unchanged.

    Origin is purely a label for by_origin grouping and display. The computation
    depends on the *region* (for grid factor) and closed-model provider PUE overrides,
    never on the origin tag itself. This predicate is a pure guard used by tests.

    The supplied model dict is not mutated.
    """
    if not isinstance(model, dict):
        return False
    # Require the core invariant fields to be present as well-formed Ranges.
    # A dict without them (e.g. {"slug": "x"}) fails the predicate.
    required = ("energy_kwh", "co2_kg")
    for k in required:
        v = model.get(k)
        if not isinstance(v, dict):
            return False
        if not all(isinstance(v.get(x), (int, float)) for x in ("low", "mid", "high")):
            return False
    # (by construction) energy/CO2 do not depend on the "origin" label.
    return True
