# LLM Carbon Index — Completion Report (2026-06-17)

End-to-end finalization of the vNext milestone: feature integration, credibility
fixes, full trilingual localization, reproducibility hardening, and repository
cleanup. `main` is green, deployed, and free of stale branches.

---

## 1. Final state

| Dimension | Result |
|---|---|
| `main` | `cf55f02` (= `origin/main`) — all PRs merged |
| Gates | `ruff` clean · **149 tests pass** · `make verify` (all dates) **PASS** (byte-identity reproducibility) |
| Open PRs | 0 |
| Local branches | `main` + `backup/vnext-wave1-20260616` (retained safety backup) |
| Remote branches | `main` + `gh-pages` (all merged feature branches deleted) |
| Working tree | clean |
| Deployment | GitHub Pages auto-deployed on the PR#2 merge (`deploy` + `pages build` both success) — live site carries vNext + i18n + contrast + ESG panel |

## 2. Merged PRs

| PR | Title | Merged |
|---|---|---|
| #1 | ci: bump GitHub Actions to Node 24 | 2026-06-16 16:01 |
| #3 | fix(7): CO₂-chain integration gaps — idle wiring, grid live zone, market residual floor, independent aggregation band | 2026-06-16 22:34 |
| #4 | fix(validate): out_path param so tests never overwrite committed validation.json | 2026-06-16 22:55 |
| #2 | vNext (Wave 1 + 2): measured energy, tiering, embodied, lit-validation, MoE, regime, ESG export | 2026-06-16 23:18 |

## 3. What shipped in vNext (PR#2)

**Wave 1 — credibility**
- **6J/P1 (keystone)** measured per-token energy + idle term; `energy_measured_fraction` 0.0 → 0.29.
- **6M/P2** ranking → **tiering** (`totals.tiers` groups overlapping CO₂ bands; current data honestly resolves to 1 tier).
- **6N/P4** physical LLMCarbon-style embodied estimator + method spread.
- **6P/P3** literature cross-validation harness → `validation.json` (BLOOM & Gemini pass, OpenAI report-only, Jegham flagged).

**Wave 2 — depth/coverage**
- **6Q/P5** MoE-aware energy (parameter-class fallback keyed on `active_params_b`).
- **6O/P6** dynamic-regime / batching + prompt-length scenarios (`regime_factors.yaml`, WhatIf sliders).
- **6R/P7** ESG / CSRD Scope-2 dual-reporting export (`esg_export.json`, EsgExportPanel).

## 4. Credibility & reproducibility fixes

- **Lint gate cleared (PR#3 follow-up):** 40 pre-existing `ruff` errors → 0 (per-file-ignores for test noise, `# noqa` with reasons on intentional swallows, dead-code removal). No behavior change.
- **Test output pollution (PR#4 + merge):** `validate_literature(out_path=…)` + `test_output.py` monkeypatches (`OUTPUT_DIR` + `OUTPUT_TIMESERIES_PATH` + `SENSITIVITY_PATH`) route every output-writing test through `tmp`. The suite no longer dirties committed `data/output/*` (root cause of `validation.json` `data_date` flipping to the `1970-01-01` epoch fallback).
- **Orphan golden removed:** `data/output/history/2026-06-15.json` had no snapshot and no manifest run entry → unverifiable. Dropped; `timeseries.json` rebuilt from remaining history. `make verify` (all dates) now PASS.
- **Merge conflict resolutions (`c01bd35`):** `energy.py` kept BOTH `idle_for_slug()` (main) and MoE `_choose_fallback_band(active_params_b)` (vnext); outputs regenerated offline from the 2026-06-14 snapshot (not hand-merged) and verified byte-identical.

## 5. Trilingual (en / zh / de) — complete

- **UI strings (`web/src/lib/i18n.ts`):** 197 keys × {en, zh, de}, verified key-parity, real translations (no placeholders).
- **Docs:** section parity with the English source for README, methodology, ASSUMPTIONS, CHANGELOG, PROJECT_STATUS, BOUNDARY, FAIRNESS, DATA_SCHEMAS, ENGINEERING_STANDARDS. Numbers / units / code fences / paths / anchors preserved verbatim.
- **Language toggle:** `en` / `zh` / `de` in-app + `?lang=` URL param. **Default language: `en`** (English-first).
- *Delegation:* the multilingual doc gap-fill was drafted by the **grok** lane and reviewed (scope, header parity, number-preservation, no-placeholder) before merge.

## 6. UI readability

- Muted secondary text `#717771` → `#969c96` (`--text-muted` + chart-tick / placeholder literals) for WCAG-AA contrast on the dark theme. `tsc -b` + `vite build` green.
- *Deferred (subjective, design review):* larger base font / typographic hierarchy / dense-table spacing.

## 7. Repository cleanup

- All merged feature branches deleted (local + remote): `claude/funny-kirch-d5ae5d`, `claude/pedantic-blackwell-790a0b`, `claude/focused-margulis-ffc352`, `claude/intelligent-heisenberg-bc4f15`, `claude/tender-gauss-cace01`, `fix/validation-out-path`, `vnext-wave1-credibility`, `i18n/doc-parity`.
- Stale `6i-resolved-fix` dropped (would have regressed provenance `0.7.0 → 0.5.0`).
- All transient worktrees removed; only the primary worktree remains.
- Salvage discipline applied during cleanup: uncommitted work in abandoned worktrees was verified against `main` before any deletion (the `out_path` fix and the 6H manifest were checked — one re-applied as PR#4, one already on `main`); nothing was force-discarded.

## 8. Known open items (non-blocking)

- Live grid-intensity integration (Electricity Maps; needs `ELECTRICITYMAPS_API_KEY`) — next candidate, not yet scoped.
- Optional UI polish: font sizing / spacing (see §6).
