# Project status & handoff

_Last updated: 2026-06-16._

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

## Status — MVP (0–5) + Phase 6A–6D done; 6E in progress
| Phase | State |
|---|---|
| 0 prove-math, 1 ingestion, 2 estimation, 3 output+schema, 4 frontend, 5 methodology+CI | ✅ done, see `specs/INDEX.md` for commit hashes |
| 6A green-electricity scenarios, 6B market-vs-location, 6C trends+Jevons, 6D water (WUE) | ✅ done (shipped in the premium dashboard; hashes in `specs/INDEX.md`) |
| 6E coverage automation (scope honesty) | ▶️ in-progress — spec `specs/phase-6e-coverage-automation.md`, live tracker `specs/PHASE6E_ORCHESTRATION.md` |

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
4. **Phase 6.** 6A–6D ✅ done (scenarios, market-vs-location, trends/Jevons, water).
   **6E coverage automation is the one remaining roadmap item** — flag OpenRouter
   top-list slugs missing from `model_crosswalk.yaml`, emit an unmapped-traffic % +
   maintenance to-do, and stop silently bucketing unknowns. Spec:
   `specs/phase-6e-coverage-automation.md`. The gap lives in `pipeline/estimate.py`
   (~L100, silent defaults when `cw is None`) + `pipeline/output.py` (~L52, uncovered
   counted only from the `is_other` row → `modeled_traffic_fraction` overstated).
5. **Loose ends (uncommitted / unmerged) — resolve before the next release:**
   - `web/src/App.tsx` working tree **deletes the entire Thesis & ESG section** (the
     CSRD / BibTeX / EU-Taxonomy block built for the German + thesis audience). Not
     reviewed yet — keep, revert, or intentional? Do not commit blindly.
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
