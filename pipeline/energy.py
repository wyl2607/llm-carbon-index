"""Energy intensity lookup + kWh conversion.

Pure given the injected tables (crosswalk + intensity.yaml content).
No I/O here; callers (estimate) supply parsed data.
"""

from __future__ import annotations

from pipeline.ranges import Range
from pipeline.slugs import normalize_slug
from pipeline.types import EnergySource


def wh_per_output_token(
    slug: str, crosswalk: list[dict], intensity_table: dict
) -> tuple[Range, EnergySource, list[str], str]:
    """Return (wh_per_output_token Range, energy_source, flags, source_id).

    Lookup order (Phase 6j update):
    - First: exact normalized match in intensity "models" (measured ai_energy_score/ecologits entries)
      take priority over cw "parameter_class_fallback" declaration. This wires sourced
      measured values so energy_measured_fraction climbs for top-traffic models that
      have defensible data.
    - If no intensity model row: fall back to original cw declared_source logic
      (parameter_class_fallback or declared-but-missing-row -> FALLBACK + class band).
    - absent slug -> UNKNOWN_MODEL + parameter_class_fallback band

    Returned energy_source is always a valid EnergySource literal. source_id is the
    provenance key (Phase 6G). Flags contain UNKNOWN_MODEL / FALLBACK_ENERGY_CLASS only
    on the fallback path (no silent 0). Model-specific numbers live only in intensity.yaml.
    """
    flags: list[str] = []
    norm = normalize_slug(slug)

    # crosswalk lookup (for declared_source on fallback path, and UNKNOWN_MODEL detection)
    cw_entry: dict | None = None
    for e in crosswalk or []:
        if normalize_slug(e.get("openrouter_slug", "")) == norm:
            cw_entry = e
            break

    if cw_entry is None:
        flags.append("UNKNOWN_MODEL")

    declared_source = (cw_entry or {}).get("energy_source", "parameter_class_fallback")

    # Phase 6j: intensity measured rows have PRIORITY (even if cw still declares fallback).
    # This allows top-traffic models to flip to ai_energy_score/ecologits by adding rows
    # here without editing crosswalk (other lanes).
    models = (intensity_table or {}).get("models", [])
    for m in models:
        if normalize_slug(m.get("openrouter_slug", "")) == norm:
            whd = m["wh_per_output_token"]
            src = m.get("energy_source") or declared_source
            if src == "parameter_class_fallback" or not src:
                # explicit measured row in intensity -> treat as sourced (prefer ai for open; ecologits only for known closed)
                src = "ecologits" if "claude" in norm else "ai_energy_score"
            sid = m.get("source_id", "E-CLASS-LARGE")
            return (
                Range(whd["low"], whd["mid"], whd["high"]),
                src,
                flags,
                sid,
            )

    # no intensity measured row for slug -> original declared / fallback logic
    use_fallback = (declared_source == "parameter_class_fallback") or (cw_entry is None)

    if use_fallback:
        if "FALLBACK_ENERGY_CLASS" not in flags:
            flags.append("FALLBACK_ENERGY_CLASS")
        bands = (intensity_table or {}).get("parameter_class_fallback", [])
        band = _choose_fallback_band(bands)
        whd = band["wh_per_output_token"]
        return (
            Range(whd["low"], whd["mid"], whd["high"]),
            "parameter_class_fallback",
            flags,
            band.get("source_id", "E-CLASS-LARGE"),
        )

    # cw declared measured source but intensity has no row -> graceful class fallback (existing behavior)
    flags.append("FALLBACK_ENERGY_CLASS")
    bands = (intensity_table or {}).get("parameter_class_fallback", [])
    band = _choose_fallback_band(bands)
    whd = band["wh_per_output_token"]
    return (
        Range(whd["low"], whd["mid"], whd["high"]),
        "parameter_class_fallback",
        flags,
        band.get("source_id", "E-CLASS-LARGE"),
    )


def idle_for_slug(
    slug: str, intensity_table: dict
) -> tuple[Range | None, float, str | None]:
    """Return (idle_kwh_per_day Range | None, idle_share_of_day, idle_source_id).

    Looks up the slug's measured intensity row (same normalized match as
    wh_per_output_token). A row carries the optional always-on/idle term only
    when a defensible per-model figure exists (ASSUMPTIONS.md#E-IDLE), e.g.::

        idle_kwh_per_day: { low: 3000, mid: 8500, high: 18000 }
        idle_share_of_day: 0.2
        idle_source_id: "E-IDLE"

    When the row has no `idle_kwh_per_day`, returns (None, 0.0, None) so callers
    fall back to the pure dynamic energy path (no silent idle attribution). All
    idle numbers live in intensity.yaml; this function does no I/O.
    """
    norm = normalize_slug(slug)
    for m in (intensity_table or {}).get("models", []):
        if normalize_slug(m.get("openrouter_slug", "")) != norm:
            continue
        idle = m.get("idle_kwh_per_day")
        if not idle:
            return None, 0.0, None
        share = float(m.get("idle_share_of_day", 0.0))
        return (
            Range(idle["low"], idle["mid"], idle["high"]),
            share,
            m.get("idle_source_id"),
        )
    return None, 0.0, None


def _choose_fallback_band(bands: list[dict]) -> dict:
    """Pick the most conservative (largest max_active) band for unknowns / fallbacks.
    If empty, synthesize a safe documented default (still flagged).
    """
    if not bands:
        # ultimate safety net; numbers match the seeded large band intent
        return {
            "max_active_params_b": 100,
            "wh_per_output_token": {"low": 0.002, "mid": 0.005, "high": 0.012},
            "source": "parameter_class_fallback (ASSUMPTIONS.md#E-CLASS-LARGE)",
            "source_id": "E-CLASS-LARGE",
        }
    # largest max_active as conservative proxy when params unknown
    return max(bands, key=lambda b: b.get("max_active_params_b") or 0)


def energy_kwh(
    wh_per_token: Range,
    output_tokens: int,
    input_tokens: int = 0,
    prefill_alpha: Range | None = None,
    idle_kwh_per_day: Range | None = None,
    share_of_day: float = 0.0,
) -> Range:
    """Total IT energy in kWh for the day's tokens.

    Decode (output) energy is the primary driver; the prefill (input) phase is
    cheaper per token but NOT zero (ASSUMPTIONS.md#E-PREFILL):

        wh = wh_per_output_token * output_tokens
           + (prefill_alpha * wh_per_output_token) * input_tokens
        energy_kwh = wh / 1000        # explicit Wh->kWh guard (ENG_STANDARDS §5)

    `prefill_alpha` is a Range (wh_per_input / wh_per_output). When it or
    input_tokens is absent, the result reduces to the legacy output-only model,
    so existing callers/tests are unaffected.

    Idle/always-on term (Phase 6j, OPTIONAL): added only when idle_kwh_per_day
    (a Range in kWh/day from intensity.yaml) and share_of_day > 0 are supplied.
        total = dynamic_kwh + (idle_kwh_per_day * share_of_day)
    Default (None/0) contributes exactly zero (no behavior change for callers
    that have not yet been updated to pass per-model idle). Only models with
    defensible idle data carry the field in intensity.yaml (E-IDLE).
    """
    decode = wh_per_token * output_tokens
    if input_tokens and prefill_alpha is not None:
        wh_per_input = wh_per_token * prefill_alpha  # Range * Range, endpoint-wise
        prefill = wh_per_input * input_tokens
        total_wh = decode + prefill
    else:
        total_wh = decode
    kwh = total_wh / 1000.0
    if idle_kwh_per_day is not None and share_of_day > 0:
        idle_contrib = idle_kwh_per_day * share_of_day  # Range * scalar -> Range
        kwh = kwh + idle_contrib  # Range + Range supported
    return kwh
