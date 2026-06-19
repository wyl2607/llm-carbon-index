# llm-carbon-index: Future Plans & To-Do

---

## OPEN BACKLOG — audit 2026-06-17 (do this before claiming "complete")

> Source: full spec + paper cross-check on 2026-06-17. The shipped log below is real,
> but the audit found one un-built spec phase, several **design logic errors in the
> auto-update path**, and gaps in the 1-year (long-termism) story: automated data
> refresh, data tracking/reproducibility, and security. Ordered by severity.

### P0 — Design logic errors — RESOLVED 2026-06-17

- [x] **B1 — Daily cron now commits its input snapshot atomically with the output.** ✅
  `pipeline/run.py` self-snapshots to `data/raw/snapshots/<date>/`; the refresh job in
  `.github/workflows/pipeline.yml` now stages **`data/output data/raw/snapshots`** in one
  commit (manifest is under `data/output/`). No more orphan goldens — every published day
  carries the frozen 6H inputs `make verify` needs to replay it.
- [x] **B2 — Cron is now gated before it can reach the public site.** ✅
  `pipeline.yml` runs `ruff check` + `pytest` + `python -m pipeline.provenance` +
  `python -m pipeline.verify` (all-dates replay) **after** the pipeline and **before** the
  commit/push. Any gate failure fails the job → no commit, no push, the run goes red. A bad
  upstream day, an unsourced model, or a non-reproducible golden can no longer land
  unreviewed. (Branch+PR flow instead of direct push to `main` remains as **S5**.)

### P1 — Spec phase not built + paper/data drift

- [x] **6L — Retro-tech (retrofuturist) frontend re-skin.** ✅ DONE 2026-06-17 (grok Lane B,
  commit `b88274c`). Added `web/src/theme/tokens.{css,ts}` (amber-phosphor on near-black,
  no hardcoded colors in components except chart data-series), restyled all 14 components,
  preserved every honesty surface (scope banner verified non-dismissible, PrecisionBanner,
  ErrorBars kept, flag→source links, FairnessNote), WCAG-AA amber-on-dark (>7:1), keyboard +
  `:focus-visible` + `prefers-reduced-motion` + semantic table/`aria-sort`, mobile reflow.
  `npm run build` (tsc+vite) green, 20/20 vitest pass. *Minor follow-up:* ~10 residual hex
  literals (mostly chart series colors) could move into tokens; specs/INDEX.md + OG image
  not updated (left for a design-review pass).
- [x] **D1 — arXiv draft numbers re-derived from latest.json.** ✅ DONE 2026-06-17 (Claude).
  In `~/Downloads/inference_carbon_index_arxiv_draft.md`: §4 dominant driver io/PUE →
  **energy_intensity** (≈ −59%/+136%, then PUE, then io); illustrative **7.7k/2.0–31.5k/16×
  → 6.4k/1.7–25.7k/~15×**; measurement **0% → ≈29%** (3 models, token-weighted; grid still 0%);
  ranking "all 10 change" → "9 of 10, collapses to a single tier"; §6 (i)–(iv) updated to
  reflect measured-fraction / physical embodied cross-check / optional idle term / tiering now
  shipped; abstract "fully fallback" → "still-largely-fallback". (External file, not in repo.)
- [x] **E1 — `.env.example` variable name fixed.** ✅ Renamed
  `ELECTRICITY_MAPS_API_TOKEN` → `ELECTRICITYMAPS_API_KEY` (the canonical name read by
  `pipeline/config.py:72` and CI). `.env.example` was the only non-doc occurrence.

### P2 — Long-termism: automated data refresh & data tracking (1-year horizon)

- [x] **L1 — Cron-failure visibility + UI staleness.** ✅ DONE 2026-06-17 (A `51e7c36` + B `b88274c`).
  `pipeline.yml` gained an `if: failure()` step that opens/updates a GitHub issue (with dedup)
  on any failed refresh (`issues: write`). UI: a `data_date`-driven "data as of / stale if
  older than 7 days" indicator (N=7 cited in code), localized en/zh/de with key parity.
- [x] **L2 — Live-grid claim made honest.** ✅ DONE 2026-06-17 (C `da7bb36`). `grid.py` already
  fell back gracefully to annual factors with explicit `grid_source`/`FALLBACK_GRID_ANNUAL`
  recording; rather than ship an untestable live call, documented the honest status in
  `docs/methodology.md §11a` + code headers: for published/reproducible goldens
  `grid_live_fraction` is and stays 0.0, annual fallback is always recorded, no number loses
  its source. Live code retained for future keyed ad-hoc runs.
- [x] **L3 — History retention + index.** ✅ DONE 2026-06-17 (C `da7bb36`). Added a lightweight
  `history/index.json` (`{data_date, totals}`) so multi-year `timeseries.json` rebuilds stay
  cheap; `write_timeseries` prefers the index and falls back to the old glob+extract if absent.
  Policy (full daily goldens retained indefinitely for verify/audit; index keeps rebuilds O(1))
  documented in methodology §11a. Index path derives dynamically so tests stay tmp-routed.
- [x] **L4 — Schema/methodology migration rule + guard.** ✅ DONE 2026-06-17 (C `da7bb36`).
  `verify.py` now FAILs with a migration-pointing message on `methodology_version` mismatch;
  methodology §11a records the rule that 6J-class changes must regenerate golden **and**
  snapshot in one commit or `make verify` fails. Current 0.7.0 matches; `make verify` PASS.

### P3 — Long-termism: security & supply chain

All S-items DONE 2026-06-17 (grok Lane A, commit `51e7c36`; all `.github/**` YAML validated):
- [x] **S1 — Dependabot.** ✅ `.github/dependabot.yml`: pip (`/`), npm (`/web`), github-actions
  (`/`); weekly, open-PR limit 5 each.
- [x] **S2 — SHA-pin third-party actions.** ✅ `peaceiris/actions-gh-pages` pinned to
  `84c30a85…e453 # v4.1.0`, gitleaks pinned to `e0c47f4f…8d1e # v3.0.0`. First-party
  `actions/*` + `astral-sh/setup-uv` left on tags (lower risk).
- [x] **S3 — Secret-scanning + SAST.** ✅ `codeql.yml` (python + js/ts; push/PR/weekly) +
  `gitleaks.yml` (push/PR, full-history checkout).
- [x] **S4 — Web dependency scan.** ✅ `npm audit --omit=dev --audit-level=high` in deploy build
  job (does not block on low/moderate).
- [x] **S5 — Least-privilege auto-push token (partial).** ✅ Top-level `permissions: {}` + the
  refresh job scoped to `contents: write` + `issues: write` with justifying comment. *Deferred:*
  the full branch+PR flow (so no unreviewed bot commit reaches the artifact) — B2 gating already
  blocks bad data, so this is a hardening nice-to-have, not a correctness gap.

> **Status 2026-06-17 (end of day):** the entire audit backlog above is **CLEARED**.
> P0 (B1/B2/E1) fixed; then P1 (6L frontend, D1 arXiv), P2 (L1–L4 long-termism), and P3
> (S1–S5 security) all landed via 3 parallel grok worktree lanes (`51e7c36` CI/security,
> `b88274c` 6L frontend, `da7bb36` pipeline long-term) consolidated on `443b6e3`. All gates
> green on the merged branch: ruff + 149 pytest + provenance + `make verify` PASS, web
> `tsc`+build + 20 vitest, all `.github` YAML valid.
> **Only deferred (intentional, non-blocking):** S5 branch+PR flow for the bot (B2 gating
> already blocks bad data); 6L polish (residual chart-color literals → tokens, specs/INDEX +
> OG image) for a design-review pass. The project is publishable in substance and now
> self-maintaining for the 1-year horizon.
>
> **Post-merge fixes (PR #5, same day):** (1) the morning cron (`2d3771a`, old pre-B1
> workflow) shipped an **orphan 2026-06-16 golden** with no snapshot → `make verify` FAIL;
> dropped it (`a00df33`), latest.json back to verifiable 2026-06-14. (2) Found+fixed an
> **L1 alerting bug**: `gh issue create --label "pipeline,automation"` would fail (labels
> don't exist) and silently create no issue; dropped `--label` (`facb272`).
> **⏳ TIME-SENSITIVE: merge PR #5 before the next 06:30 UTC cron** or the pre-B1 workflow on
> `main` reproduces the orphan-golden bug again.

---

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
- Live grid-intensity integration:
  - EIA hourly for us-east/PJM (free, via EIA_API_KEY) implemented in feat/grid-eia-us-east worktree (2026-06-18/19).
  - Electricity Maps path remains (needs key; currently 0 in published).
  - grid_live_fraction will rise on first keyed publish + snapshot.
- Verify gate unfrozen (index.json filter) + provenance extended for fuel factors.
- Fix the two integration findings below (most resolved).

### Integration findings — RESOLVED 2026-06-17
- ✅ **Test output pollution:** FIXED. `validate_literature(out_path=…)` + `test_output.py` monkeypatches (`OUTPUT_DIR` + `OUTPUT_TIMESERIES_PATH` + `SENSITIVITY_PATH`) route every output-writing test through tmp. Verified: the full suite leaves `data/output/*` clean. (PR#4 + merge `c01bd35`)
- ✅ **`make verify` (all-dates) orphan golden:** FIXED. `data/output/history/2026-06-15.json` had no snapshot and no manifest run entry; with no raw inputs to reconstruct it, the unverifiable golden was dropped and `timeseries.json` rebuilt from remaining history. `make verify` (all dates) now PASS. (`d99c39e`)

## Phase 7: i18n & UI Readability Enhancements — DONE 2026-06-17
1. ✅ **Full Chinese Localization (zh)** — `web/src/lib/i18n.ts` carries 197 keys × {en,zh,de} (verified key-parity, real translations); all docs (README/methodology/ASSUMPTIONS/CHANGELOG/…) brought to section parity with the English source.
2. ✅ **German Localization (de)** — `de` is in the language toggle (`App.tsx` `<option value="de">`, `Lang = 'en'|'zh'|'de'`); full `de` interface strings + `de` docs at parity.
3. ✅ **UI Readability — contrast** — muted secondary text `#717771` → `#969c96` (CSS var `--text-muted` + chart-tick / placeholder literals) for WCAG-AA contrast on the dark theme. `tsc -b` + `vite build` green.
   - ↪ *Optional future polish (subjective, deferred to design review):* larger base font / tighter typographic hierarchy / extra spacing on dense tables.

> Note: UI default language set to `en` (`App.tsx:34` fallback), English-first; `?lang=zh` / `?lang=de` switch via URL or the in-app toggle.
