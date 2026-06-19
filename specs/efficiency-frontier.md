# Spec — Efficiency Frontier & Rightsizing View

> **Phase**: provisionally **6M** (assign final number in `PLAN.md`; see *Sequencing* below).
> **Status**: draft spec, not yet built.
> **One-line purpose**: Surface the *waste* dimension the index currently ignores — how much of the
> OpenRouter-visible inference footprint comes from running models that are over-spec for the
> capability they deliver.

## Scope statement (inherits the project NON-NEGOTIABLE)

This view ranks models on a **capability × energy-intensity** plane and estimates an *avoidable*
fraction of CO₂ under a capability-matched substitution. It is an **upper bound on opportunity, not a
prescription**. Benchmark capability is not task fitness; a smaller model that scores ≥ X on a
composite index is **not** a guaranteed drop-in for any specific workload. All outputs remain
estimates with explicit uncertainty ranges, scoped to OpenRouter-visible traffic only.

---

## 1. Motivation

The current model is `tokens → energy → carbon`, which treats every token as equivalent. It can tell
you *which* models emit the most, but not whether that emission was **necessary**. The single most
distinctive ESG question — and the one no competing carbon tool answers — is:

> How much OpenRouter-visible inference CO₂ is attributable to running a more capable (and more
> energy-intensive) model than the delivered task quality required?

Artificial Analysis already publishes an *intelligence-vs-price* efficiency frontier. This view is its
**carbon analog**: intelligence vs CO₂/energy intensity, weighted by real traffic.

---

## 2. The two axes

| Axis | Metric | Source | Notes |
|------|--------|--------|-------|
| **X — capability** | Artificial Analysis Intelligence Index (0–100 scalar) | NEW `data/model_capability.yaml` (seeded, cited), mapped via existing `data/model_crosswalk.yaml` | Drifts weekly → pin a snapshot with `version` + `accessed`. |
| **Y — energy intensity** | `energy_wh_per_mtok` = `wh_per_output_token × 1e6` (`{low, mid, high}`) | Derived from existing per-model field | Use **mid** for plotting; carry the band. Log scale on the frontend (intensity spans orders of magnitude). |

**Why intensity, not total energy, on the Y axis**: the frontier is a property of the *model*, not of
how much it is used. Traffic only enters in §5 (the fleet number).

### Capability source detail

- **Primary**: Artificial Analysis Intelligence Index v4.1 (composite of ~9–10 benchmarks: GPQA
  Diamond, SciCode, Terminal-Bench, AA-LCR, etc.). Covers open- and closed-weight, 0–100 scale.
- **Secondary / cross-check (optional column)**: LMArena (formerly Chatbot Arena) Elo — crowd
  preference, useful as a sanity check but **not** the axis (different units, different construct).
- Models with no published score get `capability_index: null` and flag `FALLBACK_CAPABILITY`; they
  are plotted greyed and excluded from frontier definition.

---

## 3. Frontier definition (Pareto)

In the plane (capability ↑ = better, intensity ↓ = better), model **M** is **on the frontier** iff no
other eligible model **N** satisfies:

```
capability_N >= capability_M  AND  intensity_N <= intensity_M   (with at least one strict)
```

**Eligibility for *defining* the frontier (high-confidence only):**
- `energy_source == "ai_energy_score"` (NOT `parameter_class_fallback`), AND
- `capability_index != null`.

Fallback-energy models are still **plotted** (greyed) and still get a gap computed (§4), but they do
**not** define the frontier line, and they carry `LOW_CONFIDENCE_GAP`. Rationale: the frontier is only
as trustworthy as its inputs, and most closed models are still `FALLBACK_ENERGY_CLASS`. This is the
direct dependency on Phase 6F / the data-quality grade — see *Sequencing*.

Compute the frontier on **mid** intensity. Optionally expose a "robust frontier" toggle later.

---

## 4. Rightsizing gap (per model)

For model **M** with capability `c_M` and mid intensity `e_M`:

1. Reference **F** = the frontier model with the **minimum intensity** among those with
   `capability >= c_M` (the most efficient way to deliver *at least* M's capability).
2. Cases:
   - M is itself on the frontier → `rightsizing_gap_pct = 0`, `on_frontier = true`.
   - No frontier model has `capability >= c_M` (M is the most capable) → gap undefined;
     `rightsizing_gap_pct = null`, flag `NO_FRONTIER_REFERENCE`. (You cannot rightsize down without
     losing capability — that is not waste.)
   - Otherwise → compute gap below.

**Gap, with a conservative band** (clamp negatives at 0):

```
gap_mid  = (e_M.mid  - e_F.mid ) / e_M.mid
gap_low  = max(0, (e_M.low  - e_F.high) / e_M.low )   # smallest plausible gap
gap_high =        (e_M.high - e_F.low ) / e_M.high    # largest plausible gap
```

Emit `rightsizing_gap_pct = {low, mid, high}` and `frontier_reference_slug = F.slug`.

---

## 5. Fleet realized waste (traffic-weighted) — the headline number

Hold **serving region, grid intensity, and PUE constant** (compare M's traffic under M's own
conditions, just on the more efficient model). This deliberately isolates the *model-rightsizing*
lever from the *grid-shifting* lever (the latter is the separate temporal-grid work). State this
explicitly in the UI.

Per model with a defined gap, the avoidable operational CO₂ is the model's own
location-based CO₂ scaled by its rightsizing gap — applied band-to-band so units stay
safe (the gap is already dimensionless; `co2_kg` is operational location-based):

```
avoidable_co2_kg_M.x = co2_kg_M.x × rightsizing_gap_pct_M.x   for x in {low, mid, high}
```

> **Reconciliation (supersedes the earlier token-based draft).** An earlier draft derived
> `avoidable_kwh = est_output_tokens × (e_M − e_F) / 1e6` then multiplied by
> `carbon_intensity × pue`. The `co2_kg × gap_pct` form above is equivalent (the gap already
> encodes `(e_M − e_F)/e_M`, and `co2_kg` already carries the model's traffic, grid intensity
> and PUE) while being unit-safe and impossible to double-apply the grid/PUE factors. The
> executable contract is `tests/test_frontier.py::TestBands::test_avoidable_matches_gap_times_co2`.
> Holding region/grid/PUE constant is automatic here: `co2_kg` is computed under M's own
> conditions, so substituting only the model's efficiency leaves grid and cooling untouched.

**Fleet roll-up** (top-level summary block):

```
fleet_avoidable_co2_kg     = Σ avoidable_co2_kg_M   over models with a defined, high-confidence gap
fleet_avoidable_pct        = fleet_avoidable_co2_kg / total_co2_kg
```

Headline copy: *"Running OpenRouter-visible traffic on capability-matched frontier models would have
avoided ≈ X% of estimated inference CO₂ (range Y–Z%), holding region and cooling constant."*

Low-confidence (fallback-energy) models are **excluded from the headline** by default, with a UI
toggle to include them (shown as a wider, greyed band).

---

## 6. Schema additions

### Per-model (extends existing model objects)

```jsonc
{
  "capability_index": 41.0,                 // 0–100, or null
  "capability_source_id": "Q-AAII-V41",     // null if FALLBACK_CAPABILITY
  "energy_wh_per_mtok": { "low": 2000, "mid": 5000, "high": 12000 },
  "on_frontier": false,
  "frontier_reference_slug": "deepseek/deepseek-v4-flash-20260423",
  "rightsizing_gap_pct": { "low": 0.0, "mid": 0.34, "high": 0.61 },   // or null
  "avoidable_co2_kg": { "low": 0, "mid": 78421.2, "high": 410233.7 }  // or null
}
```

New flags (add to the existing `flags` vocabulary):
`ON_FRONTIER`, `FALLBACK_CAPABILITY`, `LOW_CONFIDENCE_GAP`, `NO_FRONTIER_REFERENCE`.

### Top-level summary block (new)

```jsonc
"fleet_rightsizing": {
  "basis": "capability-matched substitution; region/grid/PUE held constant; operational CO2 only",
  "avoidable_co2_kg":      { "low": 0, "mid": 612000, "high": 2480000 },
  "avoidable_pct_of_total":{ "low": 0.0, "mid": 0.18, "high": 0.34 },
  "models_included": 5,
  "models_excluded_low_confidence": 9,
  "capability_index_version": "Artificial Analysis Intelligence Index v4.1",
  "capability_index_accessed": "2026-06-16"
}
```

Bump `methodology_version` (e.g. → `0.8.0`).

### New data file — `data/model_capability.yaml` (seeded + cited)

Mirror the style of `grid_fallback_factors.yaml` (Hard Constraint #6: model data lives in `data/`
only). Keyed by the crosswalk's canonical model id.

```yaml
# Capability scores for the X axis of the efficiency frontier.
# Source drifts weekly — pin a snapshot. One source entry per provider/version.
sources:
  - id: Q-AAII-V41
    title: Artificial Analysis Intelligence Index
    publisher: Artificial Analysis
    url: https://artificialanalysis.ai/
    version: "v4.1"
    accessed: "2026-06-16"
models:
  deepseek-v4-flash:
    capability_index: 41.0
    source_id: Q-AAII-V41
    lmarena_elo: 1402        # optional cross-check, not the axis
  claude-4.7-opus:
    capability_index: 56.0
    source_id: Q-AAII-V41
# ... seed only what's in the current OpenRouter top-N; null the rest.
```

(Values above are placeholders — pull the real snapshot when seeding.)

---

## 7. Frontend view

- **Chart**: scatter, x = capability index, y = `energy_wh_per_mtok` (log). Point size = `total_tokens`
  (traffic). Point color = data confidence (`ai_energy_score` solid vs `parameter_class_fallback`
  greyed). Frontier drawn as a connected lower-left envelope.
- **Hover**: model name, capability, intensity band, `rightsizing_gap_pct`, `avoidable_co2_kg`,
  `frontier_reference_slug`.
- **Headline stat card**: `fleet_avoidable_pct` with band.
- **Toggle**: include / exclude low-confidence models from the headline (default: exclude).
- **Framing line** under the chart: "The carbon analog of Artificial Analysis's intelligence-vs-price
  frontier. Models above the line spend more energy than the most efficient model of equal-or-greater
  measured capability."

---

## 8. What this does NOT claim (scope discipline)

- **Capability ≠ task fitness.** A composite benchmark score is not a guarantee that a smaller model
  fits a specific user's task. The gap is an *opportunity ceiling*, not a recommendation to switch.
- **Region/grid/PUE held constant.** This view does not combine with grid-shifting; that is a separate
  lever and would be double-counted if merged.
- **Built mostly on estimated energy.** For `parameter_class_fallback` models the gap is low-confidence
  and excluded from the headline by default.
- **Ignores substitution friction** — latency, context window, modality, tool support, provider
  availability, price. A frontier-equivalent model may be unusable for reasons outside this plane.
- **OpenRouter-visible slice only** (existing scope guard; consumer apps excluded).

---

## 9. Tests — `tests/test_frontier.py`

- Pareto correctness on synthetic point sets (hand-verified frontier membership).
- Gap = 0 for every frontier member; `on_frontier` set correctly.
- Most-capable model → `NO_FRONTIER_REFERENCE`, `rightsizing_gap_pct == null`.
- Band ordering: `gap_low <= gap_mid <= gap_high`; `gap_low >= 0` (clamp holds).
- Fleet sum equals the sum of included per-model `avoidable_co2_kg`.
- Low-confidence models excluded from headline by default; included when toggled.
- `FALLBACK_CAPABILITY` models never appear in the frontier-defining set.
- Schema: extended output validates against the updated JSON schema.

---

## 10. Acceptance criteria (definition of done)

- [ ] `data/model_capability.yaml` created, seeded for the current OpenRouter top-N, every value cited.
- [ ] `data/model_crosswalk.yaml` extended to map OpenRouter slug → capability key.
- [ ] Pipeline computes all per-model fields + `fleet_rightsizing`; JSON validates.
- [ ] `tests/test_frontier.py` passing; total suite green.
- [ ] Frontend scatter + frontier + headline card + confidence toggle render.
- [ ] `docs/methodology.md` gains a "Rightsizing & efficiency frontier" section (axes, Pareto def,
      gap formula, fleet formula, the §8 caveats verbatim).
- [ ] `CHANGELOG.md` entry; `methodology_version` bumped.

---

## Sequencing

Recommended **after Phase 6F** (estimation-tier honesty / data-quality grade), because the
high-confidence frontier set is exactly "models with measured energy" — the same tiering 6F formalizes.
Building 6M first would force a temporary confidence heuristic you'd then rip out. No hard dependency on
the temporal-grid work (§5 holds grid constant), so the two can proceed independently.

**Cheapest-first note**: per-model gap and the scatter are computable from data you already hold plus
the one new capability file. The fleet headline number is one more aggregation. This is the
lowest-build, highest-differentiation item on the roadmap.
