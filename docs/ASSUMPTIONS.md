# docs/ASSUMPTIONS.md

Every number this project relies on lives here with a source, a value/range, and an uncertainty note. **When you introduce any new constant, coefficient, ratio, or region factor, add an entry in the same commit.** This file is the backbone of the methodology chapter / thesis.

Each entry: `ID · statement · value(range) · source · uncertainty · where used · last reviewed`.

---

## A — Modeling assumptions

### A1 — Model subset (MVP)
Start with OpenRouter top-list **open** models that have AI Energy Score data, plus 1–2 **closed** models via EcoLogits. Listed in `model_crosswalk.yaml`. Expanded in later phases. *Uncertainty:* coverage is partial; `totals.modeled_traffic_fraction` reports how much of the day's traffic is actually modeled.

### A2 — Input:output token ratio
`rankings-daily` returns **combined** prompt+completion tokens; inference energy scales mainly with **output** tokens. Default split **80:20 (input:output)** → `est_output_tokens = total_tokens × 0.20`.
- *Status:* first verify whether the API exposes a completion-only field; if so, use it and retire this assumption.
- *Source:* default informed by OpenRouter's published usage study (refine with their reported ratios). *Uncertainty:* high; treat as a sensitivity-analysis axis in the methodology. *Where used:* `pipeline/tokens.py`.

### A3 — Data-center region per model
One assumed region per provider (`closed_models.yaml`), used to fetch grid intensity. *Source:* public provider/cloud disclosures + reasonable inference. *Uncertainty:* high for closed providers (location undisclosed). Flag rows with `CLOSED_MODEL_ASSUMED`.

### A4 — Power Usage Effectiveness (PUE)
Default **1.2** (hyperscaler-class) unless a better per-provider figure exists.
- *Source:* Google data-center PUE reporting; Uptime Institute global survey. *Uncertainty:* real fleet PUE ranges ~1.1–1.6; widen the band for non-hyperscaler hosts.

---

## E — Energy intensity (Wh per output token)

These feed `data/energy/intensity.yaml`. Each model/class entry must cite how its Wh/output-token range was derived.

- **E-METHOD** — Two primary sources: (1) **AI Energy Score** (Hugging Face/Salesforce/CMU) — measured Wh per 1000 standardized queries; back out per-output-token by dividing by the assumed mean output tokens per benchmark query (record the assumed value). (2) **EcoLogits** — per-request impacts modeled from provider + model + output-token count + latency (LCA-based, ISO 14044). For closed models, parameter counts are estimates → carry a wide range. *Uncertainty:* note that a single chat-style query has been estimated anywhere from ~0.3 Wh (Google) to ~1.8–7 Wh (EcoLogits) depending on assumptions — your ranges should reflect that spread.
- **E-CLASS-\*** — Parameter-class fallback coefficients for unknown/uncovered models, keyed by active-parameter band. Source + derivation recorded per band. *Uncertainty:* very high; these exist so the pipeline degrades gracefully, not to be precise.
- **E-{MODEL}** — One entry per modeled model as it's added.

---

## C — Physical / grid constants (seeded from Phase 0; keep citing)

- **C-ENERGY-LUCCIONI** — Per-query / per-token inference energy reference figures. *Source:* Luccioni et al., 2024 (inference energy benchmarking). *Where used:* energy intensity sanity checks.
- **C-ENERGY-DEVRIES** — AI/data-center energy demand framing. *Source:* de Vries, 2023. *Where used:* magnitude sanity checks, methodology context.
- **C-PUE** — see A4 (Google / Uptime).
- **C-GRID-EGRID** — US grid emission factors. *Source:* EPA eGRID2022. *Where used:* `annual_factors.yaml` US regions; Phase 0 grid constant.
- **C-GRID-\*** — Additional regions (e.g., Ember / IEA for EU/Asia) added as `annual_factors.yaml` grows. Prefer Electricity Maps live; these are the documented fallback.

---

## L — Licensing / scope notes

- **L-EM-FREE** — Electricity Maps free tier is **non-commercial**. Decision for public deployment (academic/non-commercial use vs. academic access vs. annual-factor-heavy mode) is recorded in `methodology.md` and `README.md` before going live (Phase 5).
- **L-OR-CITATION** — OpenRouter requires the citation string in any republished figure (see ENGINEERING_STANDARDS §6).
- **L-TOKENIZER** — Token counts come from each provider's own tokenizer and are **not directly comparable** across rows; note this wherever cross-model token sums appear.

---

*Maintenance:* review the dated entries when refreshing data or before submitting the thesis. Stale grid factors and energy coefficients are the most likely to drift.
