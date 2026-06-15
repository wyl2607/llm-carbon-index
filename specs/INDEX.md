# specs/INDEX.md — How to build this project

This folder governs all development **after Phase 0**. The rule is simple:

> **One phase = one Claude Code session = one commit.** Point Claude Code at the phase spec, let it finish, verify the acceptance checklist, run `pytest`, commit. Do not start the next phase until the current one passes.

Always-loaded context lives in `/CLAUDE.md` (hard rules) and these three governance docs, which **every phase must obey**:

- `docs/ENGINEERING_STANDARDS.md` — testing, types, error handling, uncertainty representation, secrets, commits, and the reusable **Definition of Done** checklist.
- `docs/DATA_SCHEMAS.md` — the canonical shapes for every JSON/YAML artifact. The single source of truth; all phases must agree with it.
- `docs/ASSUMPTIONS.md` — the living registry of every modeling assumption and physical/grid constant, each with a source. Add to it whenever you introduce a number.

## Phase order

| Phase | Spec | Output | Status |
|-------|------|--------|--------|
| 0 | (done — see scratch/prove_math.py) | end-to-end math proven, magnitude sane | ✅ done |
| 1 | `phase-1-ingestion.md` | normalized OpenRouter time series | ✅ done (f061227) |
| 2 | `phase-2-estimation.md` | per-model energy + CO₂ with ranges | ✅ done (5a81f9b) |
| 3 | `phase-3-output-json.md` | validated `data/output/latest.json` | ✅ done (425498d) |
| 4 | `phase-4-frontend.md` | static Vite+React dashboard | ✅ done (6b5b33e) |
| 5 | `phase-5-methodology-deploy.md` | methodology doc + CI (site: enable Pages) | ✅ done (fb0c33c) |
| 6+ | `phase-6plus-roadmap.md` | scenarios, market-vs-location, trends, water, coverage | ⬜ later |

When a phase is finished, update its row to ✅ and note the commit hash.

## Each phase spec is structured the same way

`Objective → Prerequisites → Tasks → Interfaces & schemas → Test requirements → Acceptance criteria → Standards → Out of scope → Definition of Done`.

## The one thing that must never break

The **scope statement**: this project estimates the footprint of *OpenRouter-visible LLM traffic*, with explicit uncertainty ranges. It is **not** a measurement of global data-center emissions, and every number is an estimate. If a task tempts you to overstate scope or drop the uncertainty range, stop and re-read `CLAUDE.md`.
