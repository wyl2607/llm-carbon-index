# specs/phase-5-methodology-deploy.md — Methodology + deploy

## Objective
Ship publicly, automate the daily refresh, and write the methodology document (the thesis seed). Resolve the Electricity Maps licensing question before going live.

## Prerequisites
Phases 1–4 done (pipeline produces JSON; frontend renders it).

## Tasks
1. `docs/methodology.md` — the full writeup, suitable to lift into the thesis:
   - The estimation chain (tokens → output tokens → energy → ×PUE → ×grid intensity → CO₂).
   - Every assumption (pull A1–A4 + E/C/L series from `ASSUMPTIONS.md`) with sources and uncertainty.
   - **Uncertainty handling:** state plainly that ranges are a conservative endpoint band, not a statistical CI (ENGINEERING_STANDARDS §2).
   - **Scope & limitations:** OpenRouter-visible traffic only; `modeled_traffic_fraction`; tokenizer non-comparability (L-TOKENIZER); closed-model opacity.
   - **Market-based vs location-based** carbon accounting (GHG Protocol Scope 2) — describe the distinction and flag the comparison as Phase 6 work.
2. `.github/workflows/pipeline.yml` — daily **cron**; keys from repo secrets; `python -m pipeline.run`; commit `data/output/**` only if changed; concurrency guard so runs don't overlap.
3. `.github/workflows/deploy.yml` — build `web/` and deploy to Vercel **or** GitHub Pages.
4. `README.md` — polish: scope statement up top, reproduce steps, data attribution/citation, links to methodology.
5. **Licensing decision (L-EM-FREE):** decide Electricity Maps usage mode — non-commercial academic/portfolio use, apply for academic access, or annual-factor-heavy mode — and document the decision + rationale in `methodology.md` and `README.md`.

## Test requirements
- Pipeline runs green in CI using secrets (a manual `workflow_dispatch` run succeeds).
- Deploy workflow produces a reachable site.
- `methodology.md` is internally consistent with `ASSUMPTIONS.md` (no number cited without a registry entry).

## Acceptance criteria
- [ ] Scheduled CI runs the pipeline and commits updated JSON.
- [ ] Site is live and shows the disclaimer + attribution.
- [ ] `methodology.md` complete; every figure traces to `ASSUMPTIONS.md`.
- [ ] Electricity Maps licensing decision documented.

## Standards
ENGINEERING_STANDARDS §4 (secrets via CI), §6 (attribution), §7 (commits). Push happens here — but still only when the user asks.

## Out of scope
The Phase 6+ feature set.

## Definition of Done
ENGINEERING_STANDARDS §8 + acceptance above. Update `specs/INDEX.md`; MVP is now complete.
