# llm-carbon-index: Future Plans & To-Do

## vNext Wave 1 — shipped 2026-06-16 (credibility milestone)

Driven by `vNext_analysis_and_roadmap.md` + `inference_carbon_index_arxiv_draft.md`.
Four lanes built in parallel (grok), integrated A→C→B→D. Status in `specs/INDEX.md`.

- ✅ **6J / P1 (keystone)** — measured per-token energy + idle term. `energy_measured_fraction` 0.0 → **0.29** (3/50 models, token-weighted), `E-IDLE` always-on term added. (c5a70b2)
- ✅ **6M / P2** — ranking → **tiering**: `totals.tiers` groups overlapping `{low,high}` CO₂ bands. Current data → **1 tier** (all models indistinguishable), which is the honest result given the ~13× band. (dbb2424)
- ✅ **6N / P4** — physical LLMCarbon-style embodied estimator (CPA×area×amortization) alongside ratio-proxy + method spread. (b4e17ea)
- ✅ **6P / P3** — literature cross-validation harness → `validation.json`: BLOOM (3.96 Wh/q) & Gemini (0.24 Wh) **pass**, OpenAI 0.34 Wh **report-only** (blog, not peer-reviewed), Jegham 29 Wh long-prompt **flagged** (typical-query band intentionally excludes extreme long prompts). All anchor arXiv IDs web-verified. (2fccf29)

### Wave 2 — shipped 2026-06-16 (depth/coverage)
Built as 2 lanes (grok): Lane E = P5+P6 serial (both `energy.py`); Lane F = P7 (parallel).
- ✅ **P5 / 6Q** — MoE-aware energy: parameter-class fallback band keyed on `active_params_b` (not total). A high-total/low-active model now lands in the small-active class.
- ✅ **P6 / 6O** — dynamic-regime / batching + prompt-length scenarios: `regime_factors.yaml` + regime multiplier in `energy.py` + WhatIfSimulator sliders + `scenario.ts` (monotonic).
- ✅ **P7 / 6R** — ESG / CSRD Scope-2 dual-reporting export: `esg_export.json` (location + market `{low,mid,high}` + ESRS-E1 line item + non-removable scope caveat), EsgExportPanel download.

### vNext fully landed → next candidates (not yet scoped)
- Live grid-intensity integration (Electricity Maps; needs `ELECTRICITYMAPS_API_KEY`).
- Fix the two integration findings below.

### Integration findings (surface, not yet fixed)
- **Test output pollution:** parts of the pytest suite call `write_outputs`/`write_sensitivity_json` against the **real** `config` output paths, clobbering `data/output/sensitivity.json` + `timeseries.json` with degenerate fixture data. Authoritative output regen must run AFTER pytest. Fix: route output-writing tests through a tmp dir / monkeypatched config.
- **`make verify` (all-dates) fails on `2026-06-15`:** committed golden `data/output/history/2026-06-15.json` exists (origin/main commit a1c6ca5) with **no matching snapshot** under `data/raw/snapshots/`. Pre-existing, not introduced here. `make verify 2026-06-14` (keystone date) PASSES. Fix: add the 2026-06-15 snapshot or drop the orphan golden.

## Phase 7: i18n & UI Readability Enhancements
1. **Full Chinese Localization (zh)**
   - Complete missing translation keys in `web/src/lib/i18n.ts`
   - Ensure all static UI text, tooltips, banners, and methodology links are fully translated.
   - Review layout changes for localized text widths.
2. **German Localization (de)**
   - Add German to the language toggle (`en`, `zh`, `de`).
   - Implement `de` translations for all interface elements.
3. **UI Readability Optimization**
   - Increase contrast for secondary text (currently `text-[#717771]` might be too dim).
   - Enlarge base font sizes or improve typographic hierarchy.
   - Add better spacing around dense tables and KPI cards.
