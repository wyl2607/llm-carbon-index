# specs/phase-6plus-roadmap.md — Post-MVP roadmap

Each item below is a future phase. Build only after the MVP (Phases 1–5) is live. Same structure and standards apply; these are intentionally lighter and will be expanded into full specs when picked up. **6A and 6B are the differentiators that turn this from a calculator into the niche tool** described in the project's premise.

---

## 6A — Green-electricity substitution scenarios
**Objective:** let users see how CO₂ changes under grid greening. Sliders: (1) grid renewable-% uplift for a region, (2) shift a model's region to a lower-carbon one.
**Tasks:** add scenario params; recompute CO₂ either client-side from the JSON ranges or via pre-computed scenario sets in the pipeline. Define a **"neutralization %"** precisely (e.g., location-based residual emissions after the modelled green uplift) and label it — never imply offsets unless modelled.
**Acceptance:** moving a slider updates CO₂ with ranges intact; the neutralization metric has a written definition in `methodology.md`.
**Standards:** ENGINEERING_STANDARDS §2; no claim of "carbon neutral" without a defined, sourced basis.

## 6B — Market-based vs location-based comparison
**Objective:** show vendors' annual renewable-matching claims (market-based) next to real-time grid reality (location-based), per GHG Protocol Scope 2.
**Tasks:** `data/assumptions/vendor_claims.yaml` (provider → annual renewable-matching % + PPA/REC notes + source); render both numbers side by side with the Scope-2 framing.
**Acceptance:** both figures shown per provider, each sourced; the framing explains why they differ.

## 6C — Historical trends + Jevons view
**Objective:** time series from `data/output/history/*.json`; visualize cost↓ → volume↑ → emissions↑.
**Tasks:** a history loader; trend charts (tokens, CO₂, efficiency over time); a short Jevons-paradox annotation.
**Acceptance:** trends render from accumulated history; no recomputation of past days.

## 6D — Water footprint (WUE)
**Objective:** add water use as a second environmental axis.
**Tasks:** extend assumptions with per-region/per-provider WUE (sourced); add `water_liters` Range to the schema (update DATA_SCHEMAS + JSON Schema in the same commit); surface in UI.
**Acceptance:** water shown with ranges + sources; schema versioned up.

## 6E — Coverage automation (scope honesty)
**Objective:** keep the crosswalk current and quantify uncovered traffic as models churn.
**Tasks:** detect OpenRouter top-list slugs missing from `model_crosswalk.yaml`; emit a flagged "uncovered traffic %" and a maintenance to-do; never silently bucket unknowns into a known model.
**Acceptance:** new/unmapped models are flagged automatically; `modeled_traffic_fraction` stays accurate.

---

When you start any 6x item: copy this section into a full `specs/phase-6x-*.md` (Objective → Prerequisites → Tasks → Interfaces & schemas → Test requirements → Acceptance → Standards → Out of scope → Definition of Done), update DATA_SCHEMAS if shapes change, and add new numbers to ASSUMPTIONS.md.
