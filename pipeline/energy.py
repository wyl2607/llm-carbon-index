"""Energy intensity lookup + kWh conversion.

Pure given the injected tables (crosswalk + intensity.yaml content).
No I/O here; callers (estimate) supply parsed data.
"""

from __future__ import annotations

from pipeline.ranges import Range
from pipeline.types import EnergySource


def wh_per_output_token(
    slug: str, crosswalk: list[dict], intensity_table: dict
) -> tuple[Range, EnergySource, list[str]]:
    """Return (wh_per_output_token Range, energy_source, flags).

    Lookup order (see DATA_SCHEMAS §3 and phase-2 spec):
    - absent slug -> UNKNOWN_MODEL + parameter_class_fallback band
    - cw energy_source == "parameter_class_fallback" -> FALLBACK_ENERGY_CLASS + band
    - else exact match in intensity models
    - declared source but no row -> FALLBACK_ENERGY_CLASS + band

    Returned energy_source is always a valid EnergySource literal.
    Flags contain UNKNOWN_MODEL / FALLBACK_ENERGY_CLASS as applicable (no silent 0).
    """
    flags: list[str] = []

    # 1. crosswalk lookup for identity + declared energy_source tag
    cw_entry: dict | None = None
    for e in crosswalk or []:
        if e.get("openrouter_slug") == slug:
            cw_entry = e
            break

    if cw_entry is None:
        flags.append("UNKNOWN_MODEL")

    declared_source = (cw_entry or {}).get("energy_source", "parameter_class_fallback")

    use_fallback = (declared_source == "parameter_class_fallback") or (cw_entry is None)

    if use_fallback:
        if "FALLBACK_ENERGY_CLASS" not in flags:
            flags.append("FALLBACK_ENERGY_CLASS")
        bands = (intensity_table or {}).get("parameter_class_fallback", [])
        band = _choose_fallback_band(bands)
        whd = band["wh_per_output_token"]
        # source string from the band (points to ASSUMPTIONS); we still emit
        # energy_source literal "parameter_class_fallback"
        return (
            Range(whd["low"], whd["mid"], whd["high"]),
            "parameter_class_fallback",
            flags,
        )

    # 2. specific model intensity
    models = (intensity_table or {}).get("models", [])
    for m in models:
        if m.get("openrouter_slug") == slug:
            whd = m["wh_per_output_token"]
            # declared_source from cw is canonical for the output field
            return Range(whd["low"], whd["mid"], whd["high"]), declared_source, flags

    # 3. cw claimed a measured source but intensity has no row -> graceful class fallback
    flags.append("FALLBACK_ENERGY_CLASS")
    bands = (intensity_table or {}).get("parameter_class_fallback", [])
    band = _choose_fallback_band(bands)
    whd = band["wh_per_output_token"]
    return (
        Range(whd["low"], whd["mid"], whd["high"]),
        "parameter_class_fallback",
        flags,
    )


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
        }
    # largest max_active as conservative proxy when params unknown
    return max(bands, key=lambda b: b.get("max_active_params_b") or 0)


def energy_kwh(wh_per_token: Range, output_tokens: int) -> Range:
    """Total facility energy in kWh for the day's output tokens.

    = wh_per_output_token * output_tokens / 1000
    (the /1000 is the explicit Wh->kWh guard required by ENGINEERING_STANDARDS §5).
    """
    # tokens is a positive scalar here
    scaled = wh_per_token * output_tokens
    return scaled / 1000.0
