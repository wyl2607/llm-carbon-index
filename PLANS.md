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

### Integration findings — RESOLVED 2026-06-17
- ✅ **Test output pollution:** FIXED. `validate_literature(out_path=…)` + `test_output.py` monkeypatches (`OUTPUT_DIR` + `OUTPUT_TIMESERIES_PATH` + `SENSITIVITY_PATH`) route every output-writing test through tmp. Verified: the full suite leaves `data/output/*` clean. (PR#4 + merge `c01bd35`)
- ✅ **`make verify` (all-dates) orphan golden:** FIXED. `data/output/history/2026-06-15.json` had no snapshot and no manifest run entry; with no raw inputs to reconstruct it, the unverifiable golden was dropped and `timeseries.json` rebuilt from remaining history. `make verify` (all dates) now PASS. (`d99c39e`)

## Phase 7: i18n & UI Readability Enhancements — DONE 2026-06-17
1. ✅ **Full Chinese Localization (zh)** — `web/src/lib/i18n.ts` carries 197 keys × {en,zh,de} (verified key-parity, real translations); all docs (README/methodology/ASSUMPTIONS/CHANGELOG/…) brought to section parity with the English source.
2. ✅ **German Localization (de)** — `de` is in the language toggle (`App.tsx` `<option value="de">`, `Lang = 'en'|'zh'|'de'`); full `de` interface strings + `de` docs at parity.
3. ✅ **UI Readability — contrast** — muted secondary text `#717771` → `#969c96` (CSS var `--text-muted` + chart-tick / placeholder literals) for WCAG-AA contrast on the dark theme. `tsc -b` + `vite build` green.
   - ↪ *Optional future polish (subjective, deferred to design review):* larger base font / tighter typographic hierarchy / extra spacing on dense tables.

> Note: UI default language set to `en` (`App.tsx:34` fallback), English-first; `?lang=zh` / `?lang=de` switch via URL or the in-app toggle.
