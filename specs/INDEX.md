# specs/INDEX.md — How to build this project

This folder governs all development **after Phase 0**. The rule is simple:

> **One phase = one Claude Code session = one commit.** Point Claude Code at the phase spec, let it finish, verify the acceptance checklist, run `pytest`, commit. Do not start the next phase until the current one passes.

Always-loaded context lives in `/CLAUDE.md` (hard rules) and these three governance docs, which **every phase must obey**:

- `docs/ENGINEERING_STANDARDS.md` — testing, types, error handling, uncertainty representation, secrets, commits, and the reusable **Definition of Done** checklist.
- `docs/DATA_SCHEMAS.md` — the canonical shapes for every JSON/YAML artifact. The single source of truth; all phases must agree with it.
- `docs/ASSUMPTIONS.md` — the living registry of every modeling assumption and physical/grid constant, each with a source. Add to it whenever you introduce a number. **From Phase 6G on, this is machine-enforced: every number must resolve to an entry in `data/provenance/sources.yaml` or the build fails.**

## Phase order

| Phase | Spec | Output | Status |
|-------|------|--------|--------|
| 0 | (done — see scratch/prove_math.py) | end-to-end math proven, magnitude sane | ✅ done |
| 1 | `phase-1-ingestion.md` | normalized OpenRouter time series | ✅ done |
| 2 | `phase-2-estimation.md` | per-model energy + CO₂ with ranges | ✅ done |
| 3 | `phase-3-output-json.md` | validated `data/output/latest.json` | ✅ done |
| 4 | `phase-4-frontend.md` | static Vite+React dashboard | ✅ done |
| 5 | `phase-5-methodology-deploy.md` | methodology doc + CI + live site | ✅ done |
| 6A | `phase-6plus-roadmap.md` | green-electricity substitution scenarios | ✅ done |
| 6B | `phase-6plus-roadmap.md` | market-based vs location-based comparison | ✅ done |
| 6C | `phase-6plus-roadmap.md` | historical trends + Jevons view | ✅ done |
| 6D | `phase-6plus-roadmap.md` | water footprint (WUE) | ✅ done |
| 6E | `phase-6plus-roadmap.md` | coverage automation (scope honesty) | ✅ done |
| 6F | `phase-6f-estimation-tier-honesty.md` | `totals.precision` (measured% / live-grid%) + UI honesty banner | ✅ done |
| 6G | `phase-6g-provenance-ledger.md` | source registry + per-figure `source_id` + "no unsourced number" CI gate | ✅ done |
| 6H | `phase-6h-reproducibility-harness.md` | input snapshots, deterministic re-run, `make verify`, checksum manifest | ✅ done |
| 6I | `phase-6i-fairness-and-boundary.md` | `BOUNDARY.md` + `FAIRNESS.md` + `totals.fairness` (rank stability, unweighted) | ✅ done |
| **6J** | `phase-6j-sourced-energy-upgrade.md` | measured energy for top-traffic models; `energy_measured_fraction` rises | ✅ done (c5a70b2; measured_fraction 0.0→0.29, 3/50 models, + E-IDLE term) |
| 6K | `phase-6k-uncertainty-and-sensitivity.md` | `sensitivity.json` + dominant driver; thesis-grade methodology | ✅ done (`2b321f3`; OAT sensitivity → `sensitivity.json`, dominant driver = energy_intensity, surfaced in UI footer + methodology) |
| 6L | `phase-6l-retro-tech-frontend.md` | retrofuturist re-skin, honesty surfaces preserved | ✅ done (`b88274c` + token polish) |
| **6M** | (vNext P2; spec inline in roadmap) | ranking → **tiering** honesty: `totals.tiers` groups overlapping `{low,high}` CO₂ bands; tiers headline, ranks secondary | ✅ done (dbb2424) |
| **6N** | (vNext P4; spec inline in roadmap) | physical LLMCarbon-style embodied estimator (`pipeline/embodied.py`, CPA×area×amortization) alongside ratio-proxy + method spread | ✅ done (b4e17ea) |
| **6P** | (vNext P3; spec inline in roadmap) | literature cross-validation harness (`validate_literature.py` + `literature_anchors.yaml` → `validation.json`): BLOOM/Gemini pass, OpenAI report-only, Jegham long-prompt flagged | ✅ done (2fccf29) |
| **6Q** | (vNext P5; spec inline in roadmap) | MoE-aware energy: parameter-class fallback band keyed on `active_params_b` (not total) | ✅ done (Wave 2) |
| **6O** | (vNext P6; spec inline in roadmap) | dynamic regime / batching + prompt-length scenarios (`regime_factors.yaml` + WhatIfSimulator sliders + scenario.ts) | ✅ done (Wave 2) |
| **6R** | (vNext P7; spec inline in roadmap) | ESG / CSRD Scope-2 dual-reporting export (`esg_export.json` + EsgExportPanel + ESRS-E1 line item, non-removable caveat) | ✅ done (Wave 2) |
| Grid live (EIA) | (feat/grid-eia-us-east + #23) | EIA v2 hourly fuel-type-data for us-east/PJM as highest-priority live source (fallback to annual); provenance-gated factors; CI-only secret; precision surface `eia_live` | ✅ done (local integration a256166 + PR #23; live verified via dispatch) |
| Efficiency frontier + real data + UI | (specs/efficiency-frontier.md + #22) | `data/model_capability.yaml` (AA Intelligence Index v4.1 max-effort snapshot, Q-AAII-V41); `pipeline/frontier.py` + fleet_rightsizing; `/frontier` recharts view (scatter + envelope + headline + low-conf toggle) | ✅ done (real data 2026-06-19; UI wired in main.tsx + Nav + i18n; PR #22) |

When a phase is finished, update its row to ✅ and note the commit hash.

> **Note:** 6A–6E shipped from `phase-6plus-roadmap.md`; backfill their commit hashes from your `git log` (or split into `phase-6{a..e}-*.md` files if you want full specs on record). 6F–6L below are full specs, ordered to the project's stated priority.

## Build tiers (the priority order)

1. **Integrity tier — do first, in order: 6F → 6G → 6H → 6I.** Verifiability, provenance/traceability, reproducibility, fairness, and boundary completeness. None of these invent data; they make what's already true auditable. This is where the project's *公正 / 学术 / 完整 / 可被验证 / 溯源* lives.
2. **Accuracy tier — 6J → 6K.** Replace fallbacks with sourced measurements where defensible, then derive and stress-test the uncertainty. *真正的学术级别的准确性和考究.*
3. **Design tier — 6L.** Retro-tech (retrofuturist) re-skin over a finished, honest dataset. Design serves transparency, last.

## Each phase spec is structured the same way

`Objective → Prerequisites → Tasks → Interfaces & schemas → Test requirements → Acceptance criteria → Standards → Out of scope → Definition of Done`.

## The one thing that must never break

The **scope statement**: this project estimates the footprint of *OpenRouter-visible LLM traffic*, with explicit uncertainty ranges. It is **not** a measurement of global data-center emissions, and every number is an estimate. If a task tempts you to overstate scope, drop the uncertainty range, or **fabricate a "sourced" number that has no source**, stop and re-read `CLAUDE.md`. (6G turns that last rule into a build gate.)
