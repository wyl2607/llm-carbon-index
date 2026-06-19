"""Phase 6M: efficiency frontier + rightsizing (spec: specs/efficiency-frontier.md).

Ranks models on a capability x energy-intensity plane and estimates the
*avoidable* fraction of operational CO2 under a capability-matched substitution
(region/grid/PUE held constant). This is an upper bound on opportunity, not a
prescription (see spec scope statement, and §8 caveats).

Public API (the executable contract is tests/test_frontier.py):
    compute_frontier(models)          -> set[str]   high-confidence Pareto frontier slugs
    annotate_models(models)           -> list[dict] per-model rightsizing fields (pure)
    compute_fleet_rightsizing(models) -> dict        top-level fleet_rightsizing block

No model facts (capability scores, intensities) live here — they arrive on the
model dicts (capability_index from data/model_capability.yaml, energy_wh_per_mtok
derived from the per-model wh_per_output_token band). See CLAUDE.md Hard
Constraint #6 (model data only in data/*.yaml).
"""
from __future__ import annotations

import copy

AI_ENERGY = "ai_energy_score"
FALLBACK_ENERGY = "parameter_class_fallback"

# Methodology string (not a model fact): describes what the headline number isolates.
FLEET_BASIS = (
    "capability-matched substitution; region/grid/PUE held constant; operational CO2 only"
)


def _intensity_mid(model: dict) -> float:
    """Y axis = energy_wh_per_mtok mid (a property of the model, not of its traffic)."""
    return float(model["energy_wh_per_mtok"]["mid"])


def _is_eligible(model: dict) -> bool:
    """Eligible to DEFINE the frontier: measured energy AND a published capability score.

    Fallback-energy and no-capability models are still plotted + gap-computed
    elsewhere, but the frontier is only as trustworthy as its inputs.
    """
    return model.get("energy_source") == AI_ENERGY and model.get("capability_index") is not None


def compute_frontier(models: list[dict]) -> set[str]:
    """Slugs on the high-confidence Pareto frontier (capability up, intensity down).

    M is on the frontier iff no other eligible N strictly dominates it:
        capability_N >= capability_M AND intensity_N <= intensity_M  (with one strict).
    Read-only; never mutates the inputs.
    """
    eligible = [m for m in models if _is_eligible(m)]
    frontier: set[str] = set()
    for m in eligible:
        cap_m = float(m["capability_index"])
        int_m = _intensity_mid(m)
        dominated = False
        for n in eligible:
            if n is m:
                continue
            cap_n = float(n["capability_index"])
            int_n = _intensity_mid(n)
            if cap_n >= cap_m and int_n <= int_m and (cap_n > cap_m or int_n < int_m):
                dominated = True
                break
        if not dominated:
            frontier.add(m["slug"])
    return frontier


def _gap_band(e_m: dict, e_f: dict) -> dict:
    """Rightsizing gap band vs reference F, clamping the low end at 0 (spec §4)."""
    return {
        "low": max(0.0, (float(e_m["low"]) - float(e_f["high"])) / float(e_m["low"])),
        "mid": (float(e_m["mid"]) - float(e_f["mid"])) / float(e_m["mid"]),
        "high": (float(e_m["high"]) - float(e_f["low"])) / float(e_m["high"]),
    }


def _append_flag(flags: list[str], flag: str) -> None:
    if flag not in flags:
        flags.append(flag)


def annotate_models(models: list[dict]) -> list[dict]:
    """Return deep-copied models enriched with rightsizing fields + appended flags.

    Adds: on_frontier, frontier_reference_slug, rightsizing_gap_pct ({low,mid,high}|None),
    avoidable_co2_kg ({low,mid,high}|None). Pre-existing flags are preserved; inputs
    are never mutated.
    """
    annotated = copy.deepcopy(models)
    frontier = compute_frontier(annotated)

    caps = [
        float(m["capability_index"])
        for m in annotated
        if m.get("capability_index") is not None
    ]
    max_cap = max(caps) if caps else None
    n_at_max = sum(1 for c in caps if c == max_cap) if max_cap is not None else 0

    for m in annotated:
        flags: list[str] = list(m.get("flags") or [])
        on_frontier = m["slug"] in frontier
        if on_frontier:
            _append_flag(flags, "ON_FRONTIER")

        cap = m.get("capability_index")
        gap: dict | None
        reference: str | None = None

        if cap is None:
            # No capability score: cannot place on the plane -> no gap (spec §2).
            gap = None
            _append_flag(flags, "FALLBACK_CAPABILITY")
        else:
            cap = float(cap)
            e_m = m["energy_wh_per_mtok"]
            # Reference F: most efficient frontier model (other than M) that delivers
            # at least M's capability.
            candidates = [
                n for n in annotated
                if n["slug"] in frontier
                and n["slug"] != m["slug"]
                and float(n["capability_index"]) >= cap
            ]
            f = min(candidates, key=_intensity_mid) if candidates else None

            if f is not None and _intensity_mid(f) < _intensity_mid(m):
                gap = _gap_band(e_m, f["energy_wh_per_mtok"])
                reference = f["slug"]
            elif f is not None:
                # A higher-or-equal-capability frontier model exists but is not more
                # efficient -> M is already at/under the frontier for its tier.
                gap = {"low": 0, "mid": 0, "high": 0}
            else:
                # No frontier reference reaches M's capability. If M is the unique
                # global most-capable model, rightsizing down would lose capability
                # (not waste); a lone model is simply its own frontier.
                is_unique_most_capable = (
                    len(annotated) > 1 and cap == max_cap and n_at_max == 1
                )
                if is_unique_most_capable:
                    gap = None
                    _append_flag(flags, "NO_FRONTIER_REFERENCE")
                elif on_frontier:
                    gap = {"low": 0, "mid": 0, "high": 0}
                else:
                    gap = None
                    _append_flag(flags, "NO_FRONTIER_REFERENCE")

        if m.get("energy_source") == FALLBACK_ENERGY:
            # Gap (if any) is computed against the high-confidence frontier, but the
            # input energy is estimated -> low confidence, excluded from the headline.
            _append_flag(flags, "LOW_CONFIDENCE_GAP")

        if gap is None:
            avoidable: dict | None = None
        else:
            co2 = m.get("co2_kg") or {"low": 0, "mid": 0, "high": 0}
            avoidable = {x: float(co2[x]) * gap[x] for x in ("low", "mid", "high")}

        m["on_frontier"] = on_frontier
        m["frontier_reference_slug"] = reference
        m["rightsizing_gap_pct"] = gap
        m["avoidable_co2_kg"] = avoidable
        m["flags"] = flags

    return annotated


def compute_fleet_rightsizing(
    models: list[dict],
    include_low_confidence: bool = False,
    capability_index_version: str | None = None,
    capability_index_accessed: str | None = None,
) -> dict:
    """Traffic-weighted fleet roll-up of avoidable operational CO2 (spec §5).

    Sums avoidable_co2_kg over models with a defined gap that are NOT themselves on
    the frontier. High-confidence (ai_energy_score) models only by default;
    low-confidence (fallback-energy) models are excluded from the headline unless
    include_low_confidence=True. avoidable_pct_of_total uses total co2_kg over ALL
    models as the denominator.
    """
    annotated = annotate_models(models)
    frontier = compute_frontier(models)

    avoidable = {"low": 0.0, "mid": 0.0, "high": 0.0}
    models_included = 0
    models_excluded_low_confidence = 0

    for m in annotated:
        gap = m["rightsizing_gap_pct"]
        if gap is None or m["slug"] in frontier:
            continue
        high_confidence = m.get("energy_source") == AI_ENERGY
        if high_confidence or include_low_confidence:
            av = m["avoidable_co2_kg"]
            for x in ("low", "mid", "high"):
                avoidable[x] += float(av[x])
            models_included += 1
        else:
            models_excluded_low_confidence += 1

    total = {"low": 0.0, "mid": 0.0, "high": 0.0}
    for m in annotated:
        co2 = m.get("co2_kg") or {}
        for x in ("low", "mid", "high"):
            total[x] += float(co2.get(x, 0.0))

    pct = {
        x: (avoidable[x] / total[x]) if total[x] else 0.0
        for x in ("low", "mid", "high")
    }

    return {
        "basis": FLEET_BASIS,
        "avoidable_co2_kg": avoidable,
        "avoidable_pct_of_total": pct,
        "models_included": models_included,
        "models_excluded_low_confidence": models_excluded_low_confidence,
        "capability_index_version": capability_index_version,
        "capability_index_accessed": capability_index_accessed,
    }
