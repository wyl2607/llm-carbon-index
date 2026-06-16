# llm-carbon-index: Future Plans & To-Do

---

## OPEN BACKLOG — audit 2026-06-17 (do this before claiming "complete")

> Source: full spec + paper cross-check on 2026-06-17. The shipped log below is real,
> but the audit found one un-built spec phase, several **design logic errors in the
> auto-update path**, and gaps in the 1-year (long-termism) story: automated data
> refresh, data tracking/reproducibility, and security. Ordered by severity.

### P0 — Design logic errors (they silently break the project's core promise)

- [ ] **B1 — Daily cron does NOT commit its own input snapshot → unverifiable orphan goldens.**
  `pipeline/run.py` self-snapshots to `data/raw/snapshots/<date>/`, but
  `.github/workflows/pipeline.yml` only `git add data/output`. Every auto-refreshed day
  ships a golden whose 6H snapshot is never committed — re-creating exactly the "lost
  input" failure DISCOVERIES.md documented and the 2026-06-15 orphan-golden we already
  had to drop by hand. **Fix:** the refresh job must `git add data/output data/raw/snapshots`
  (and the manifest) in one commit, atomically.
- [ ] **B2 — Cron auto-pushes to `main` with no gate.** `pipeline.yml` runs the pipeline and
  `git push` straight to `main` with *no* `pytest`, *no* `make verify`, *no* provenance
  gate. A bad upstream day, a new unsourced model, or a non-reproducible golden lands on
  the public site unreviewed. **Fix:** run `ruff` + `pytest` + `python -m pipeline.provenance`
  + `make verify <date>` before commit; on failure, open a PR / issue instead of pushing.

### P1 — Spec phase not built + paper/data drift

- [ ] **6L — Retro-tech (retrofuturist) frontend re-skin.** `specs/phase-6l-retro-tech-frontend.md`
  exists; implementation does **not** (no `web/src/theme/` tokens, no phosphor/CRT/grid
  styling, acceptance boxes all unchecked). The only spec'd dev phase still open. Must
  preserve every honesty surface (scope banner, precision%, range error-bars,
  flag→source links, fairness note); ranges never collapsed to a bare number;
  WCAG-AA + keyboard + `prefers-reduced-motion`. Design serves transparency, last.
- [ ] **D1 — arXiv draft numbers are stale vs current data.** `inference_carbon_index_arxiv_draft.md`
  still says "**0%** of model energy from measurement" (now **29%**), names io-ratio/PUE as
  top drivers (current `sensitivity.json` dominant = **energy_intensity**; io=rank 3,
  PUE=rank 2), and cites "**7.7k tCO₂e / 16×**" (current `co2_kg_total` mid ≈ **6.4k**, band
  1.67k–25.7k ≈ 15×). Re-derive §4 illustrative numbers + §6 limitations (i–iv already
  resolved) from `data/output/latest.json` before submission.
- [ ] **E1 — `.env.example` variable name mismatch.** It documents
  `ELECTRICITY_MAPS_API_TOKEN`; code + CI read `ELECTRICITYMAPS_API_KEY`
  (`pipeline/config.py:72`). A dev following the example sets the wrong name → live grid
  silently off. **Fix:** rename in `.env.example` (and any docs) to the canonical name.

### P2 — Long-termism: automated data refresh & data tracking (1-year horizon)

- [ ] **L1 — Silent cron-failure blindness.** If the daily refresh dies (upstream change,
  expired key, rate-limit), nothing alerts and the site quietly serves stale data. **Add:**
  failure notification (issue-on-failure / status badge) **and** a visible "data as of /
  stale if older than N days" indicator in the UI driven by `data_date`.
- [ ] **L2 — Live grid integration is plumbed but inert.** `grid_live_fraction = 0.0`; the
  secret is passed to cron but no live value is produced (paper limitation vii). Decide:
  wire Electricity Maps live for known regions **or** stop advertising the secret. Until
  wired, the "live-grid %" honesty metric is permanently 0.
- [ ] **L3 — History growth / retention policy.** `timeseries.json` is rebuilt from all of
  `data/output/history/**`; define retention, compaction, or an index so multi-year daily
  cadence stays cheap and the repo doesn't bloat with snapshots.
- [ ] **L4 — Schema/methodology versioning & migration.** `METHODOLOGY_VERSION` exists; add
  an explicit migration note + golden-regeneration rule (DISCOVERIES already flags: 6J-class
  changes must regenerate golden **and** snapshot in one commit or `make verify` fails).

### P3 — Long-termism: security & supply chain

- [ ] **S1 — No Dependabot / Renovate.** `SECURITY.md` names build-dependency supply-chain as a
  primary risk but nothing automates updates. Add Dependabot for `uv` (pip), `npm` (web),
  and GitHub Actions.
- [ ] **S2 — Mutable action tags.** Workflows pin `actions/checkout@v5`, `peaceiris/...@v4`,
  etc. by mutable tag. SHA-pin third-party actions (esp. the gh-pages deployer that has
  `contents: write`) to prevent tag-move supply-chain attacks.
- [ ] **S3 — No secret-scanning / SAST in CI.** ruff `S` (bandit) catches python patterns but
  not a committed `.env`/token. Add gitleaks (or GitHub secret scanning) + CodeQL.
- [ ] **S4 — No web dependency scan.** Add `npm audit` (or equivalent) to the deploy/CI path so
  frontend supply-chain regressions surface.
- [ ] **S5 — Least-privilege for the auto-push token.** The cron job pushes to `main` with
  `contents: write`. Once B2 lands (gate-or-PR), prefer a branch+PR flow so no unreviewed
  bot commit can reach the published artifact.

> **Continue developing?** Yes — the core (phases 1–6K) and every paper method are done and
> exceed the draft, so the project is publishable in substance. But it is **not** "complete":
> P0 must be fixed before trusting the daily auto-update, and 6L + the security/long-term
> items (P1–P3) are the real remaining work for a credible, self-maintaining 1-year artifact.

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
