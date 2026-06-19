# Project status & handoff

_Last updated: 2026-06-19 (post EIA + frontier handoff)._

## What this is
LLM Carbon Index — estimates the CO₂ footprint of **OpenRouter-visible** LLM
inference (estimates with `{low,mid,high}` ranges, **not** measurements; partial
slice, not global emissions). Static pipeline → committed JSON → static frontend.

- **Repo:** https://github.com/wyl2607/llm-carbon-index (public)
- **Live site:** https://wyl2607.github.io/llm-carbon-index/ (GitHub Pages)

## Where everything lives (repo is self-contained)
- `PLAN.md` — the original phased plan. `CLAUDE.md` — hard rules.
- `specs/INDEX.md` + `specs/phase-*.md` — the build manual (was the specs zip).
- `docs/ENGINEERING_STANDARDS.md`, `docs/DATA_SCHEMAS.md` (canonical artifact
  shapes), `docs/ASSUMPTIONS.md` (every number + source), `docs/methodology.md`
  (thesis-grade writeup), `docs/absorbed-from-gemini.md` (merge provenance).
- `pipeline/` — `config.py`/`types.py` (frozen cross-phase contracts), `openrouter.py`
  + `storage.py` + `ingest.py` (P1), `ranges/tokens/energy/grid/carbon/estimate.py`
  (P2), `output.py` + `run.py` (P3). `schemas/output.schema.json`.
- `data/` — `crosswalk/`, `energy/`, `assumptions/`, `grid/` (seeded YAML),
  `output/latest.json` + `history/{date}.json` (committed by CI). `data/raw/` is cache (gitignored).
- `web/` — Vite+React+TS dashboard reading `data/output/latest.json`. `scratch/prove_math.py` is the Phase-0 prover.

## Status — MVP (0–5) + Phase 6A–6E done
| Phase | State |
|---|---|
| 0 prove-math, 1 ingestion, 2 estimation, 3 output+schema, 4 frontend, 5 methodology+CI | ✅ done, see `specs/INDEX.md` for commit hashes |
| 6A green-electricity scenarios, 6B market-vs-location, 6C trends+Jevons, 6D water (WUE) | ✅ done (shipped in the premium dashboard; hashes in `specs/INDEX.md`) |
| 6E coverage automation (scope honesty) | ✅ done — backend 65463cf + frontend 414f06e; UI note dormant until pipeline emits a non-zero unmapped fraction (all current top models are mapped) |

- Tests: `uv run pytest -q` → 51 collected/green; `uv run ruff check .` clean.
- `python -m pipeline.run --date latest` produces a schema-valid `latest.json`.
- CI: `ci.yml` (tests/ruff on PR/push), `pipeline.yml` (daily 06:30 UTC cron +
  `workflow_dispatch`, uses repo secret `OPENROUTER_API_KEY`, commits data if
  changed), `deploy.yml` (Pages; chained off pipeline via `workflow_run`).
- Live site verified showing **real** OpenRouter data (50 models, modeled_traffic_fraction ≈ 0.94).

## Known issues / top next tasks
1. ~~**Crosswalk vs real slugs (highest value).** Real OpenRouter `model_permaslug`
   values carry date suffixes (e.g. `minimax/minimax-m3-20260531`), so they miss
   the Phase-2 crosswalk seeds → every real model currently resolves to
   `UNKNOWN_MODEL` + `FALLBACK_ENERGY_CLASS` + origin `OTHER` (honest, but not
   insightful). Fix: normalize permaslug→base slug (strip date suffix) and/or
   expand `data/crosswalk/model_crosswalk.yaml` + `data/energy/intensity.yaml`
   with the current top models (with sources in `ASSUMPTIONS.md`).~~ **(✅ Fixed)**
2. **Live grid data.** Set repo secret `ELECTRICITYMAPS_API_KEY` to use live
   intensity; without it `grid.py` falls back to annual factors (`FALLBACK_GRID_ANNUAL`).
3. **🔑 Rotate the OpenRouter key.** It was shared in plaintext during dev; rotate
   it on openrouter.ai and re-set the secret: `gh secret set OPENROUTER_API_KEY --repo wyl2607/llm-carbon-index`.
4. **Phase 6 — all roadmap items ✅ done.** 6A–6D (scenarios, market-vs-location,
   trends/Jevons, water) + **6E coverage automation** (flag unmapped top-list slugs,
   unmapped-traffic % + maintenance to-do, stop silently bucketing unknowns; backend
   65463cf, frontend 414f06e, spec `specs/phase-6e-coverage-automation.md`). The 6E UI
   note stays dormant until a top model falls outside `model_crosswalk.yaml` (currently
   all are mapped → unmapped fraction = 0, which is correct).
5. **Loose end — unmerged work (decide before next release):** (The App.tsx Thesis & ESG
   section removal is now committed on main — e56d2a2, per the decision to keep it.)
   - `feat/scenario-math` (worktree `../llm-carbon-index-6a`, commit 2281962) extracts
     the green-shift CO₂ math into a tested pure fn — **ahead of main, unmerged.**

## Multi-agent orchestration (what worked / current limits)
- **grok** was the reliable in-Claude-Code write lane (`--cwd <wt> --always-approve
  --prompt-file`); ran Phases 1/2/3/4 in parallel worktrees. **agy cannot write
  headlessly inside Claude Code** (its only auto-approve flag is classifier-blocked).
  **gemini/opencode** = light read-only / review only.
- **⚠️ Update 2026-06-16:** inside the current Claude Code session the auto-mode
  classifier now ALSO blocks `grok --always-approve` (flagged as an autonomous-agent
  loop / "Create Unsafe Agents"). With agy + grok auto-write both blocked and the
  gemini free tier returning 429 "no capacity", the compliant pattern degrades to
  **lanes generate to stdout (read-only) → Claude reviews, applies, and runs
  `uv run pytest -q` / `ruff` to verify.** Do not retry the auto-approve flags inside
  Claude Code; drive writes through Claude or an interactively-approved lane.
  (gemini in `--approval-mode plan` was still observed editing a file in place — treat
  its output as untrusted and diff it.)
- Coordinator must freeze cross-phase contracts (`types.py`/`config.py`/`schemas/
  output.schema.json`/pinned deps/fixtures) before fan-out, then verify each
  diff/build/test and integrate.

## 2026-06-19 handoff status (EIA + efficiency frontier closeout)
- All implementation complete (EIA adapter + fuel factors + provenance; real AA v4.1 capability snapshot; frontier computation + full `/frontier` UI with scatter, headline, toggle).
- Local main has integrated #21 (verify glob) + #24 (float tolerance) + #23 (EIA) + #18 (CN grid/PUE) + #22 (frontier) + golden regen + web data sync. Full gates green: 177 tests, ruff, provenance, `make verify` PASS.
- `EIA_API_KEY` secret set in repo (user action today). Live path is CI-only.
- 5 PRs remain open on GitHub; local integration ahead of origin. Recommended merge order on remote: #21 → #24 → #23 → #18 → #22.
- "Operational gotchas" in CONTRIBUTING.md expanded with agent workflow, CI-secret verify instructions, and the two verify failure modes. ENGINEERING_STANDARDS DoD now points agents at the gotchas.
- Next concrete action (once authorized): throwaway dispatch on a branch containing the verify fixes + EIA to capture a committed snapshot with `grid_source: eia_live` + ~349.7 intensity; then remote merges.
- This handoff demonstrated the cheap-model (worktree) + Grok (review, integration, live CI evidence, doc capture) loop end-to-end for credibility-critical work. Lessons persisted so future agents do not re-investigate.
