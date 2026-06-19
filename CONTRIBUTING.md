# Contributing

Thanks for helping! This project values **transparency and honesty about
uncertainty** above polish. Read `PLAN.md` (the canonical plan) and `CLAUDE.md`
(operating rules) first.

## Workflow

- **One phase at a time, in order.** Each phase ends with **tests green + a
  commit** before the next begins. Do not skip ahead.
- Prefer **small, reviewable diffs**. State any assumption you make.
- Pipeline is **Python**; frontend is a **static Vite + React** app that reads
  committed JSON from `output/`. There is no live backend for v1.

## Hard constraints (CI and review will reject violations)

1. **Secrets never touch git.** Read keys from env vars; `.env` is gitignored;
   `.env.example` documents names only. CI uses repository secrets.
2. **No magic numbers.** Every numeric constant (energy intensity, PUE, emission
   factor, parameter count) cites a source in a code comment **and** in
   `docs/methodology.md`.
3. **Tests for the whole CO₂ chain**, especially unit-conversion guards
   (Wh↔kWh, g↔kg, per-token↔per-1000-queries). Conversion errors are the #1 risk.
4. **No silent 0/null for unknown models.** Flag `source: "fallback"` with a
   `confidence` field. An unknown model must never silently contribute 0.
5. **Carry uncertainty as `{min, max}` ranges end-to-end.** Never collapse to a
   single false-precision number.
6. **Model data lives ONLY in `data/*.yaml`.** No model names, params, hardware,
   or regions hardcoded in `.py`.
7. **OpenRouter:** ≤30 req/min, ≤500 req/day; include the attribution string.
8. **Electricity Maps:** respect free-tier terms; fall back to annual grid
   factors and record which source was used per row.
9. **Tokenizer caveat:** token counts across providers are not directly
   comparable — note this in any cross-model aggregate.

## Before opening a PR

```bash
uv run pytest
uv run ruff check .
```

Fill in the PR checklist (it mirrors the hard constraints).

## Correcting data / assumptions

Found a wrong constant or a better source? Open a **Data correction** issue or
PR editing the relevant `data/*.yaml` and `docs/methodology.md` together — keep
the value and its citation in lockstep.

## Operational gotchas (read this before re-investigating)

Hard-won knowledge that is easy to rediscover the slow way. If something below
contradicts the code, the code wins — fix this list.

### Regenerating a golden after a data/code change
Any change that alters committed output (`data/output/history/<date>.json`,
`latest.json`) must regenerate the golden **and** its manifest checksums in the
same commit (the L4 rule; the reproducibility gate enforces it). Offline, from
the frozen snapshot — no API key needed:

```bash
uv run python -c "from pipeline.verify import reproduce; from pipeline.output import write_outputs; write_outputs(reproduce('2026-06-14'))"
# then recompute manifest digests (inputs + output) from the actual files:
uv run python -c "import json; from pipeline.manifest import sha256_file; import pipeline.config as c; \
m=json.loads(c.MANIFEST_PATH.read_text()); s=c.SNAPSHOTS_DIR/'2026-06-14'; \
[r.__setitem__('inputs',{k:sha256_file(s/k) for k in r['inputs']}) or r.__setitem__('output_sha256', sha256_file(c.OUTPUT_HISTORY_DIR/'2026-06-14.json')) for r in m['runs'] if r['data_date']=='2026-06-14']; \
c.MANIFEST_PATH.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n')"
cd web && node scripts/copy-data.cjs   # sync web/public/data
```
`data/output/history/index.json` is a **generated, untracked** artifact — never
stage it. The capability/grid YAMLs are NOT part of the frozen snapshot, so
`reproduce()` always reads their current values.

### The reproducibility gate has TWO distinct failure modes
`python -m pipeline.verify` (the daily `pipeline-refresh` cron) can fail for two
unrelated reasons — fixing one does not fix the other:
1. **Non-date files in the glob** — `_all_dates()` skips anything not matching
   `YYYY-MM-DD` (e.g. `index.json`). Don't reintroduce a bare `*.json` glob.
2. **Cross-platform float drift** — goldens are compared with `_docs_equiv`
   (floats within rel_tol 1e-9 / abs_tol 1e-6; ints/structure exact). Float
   summation is non-associative, so an exact string compare fails on last-ULP
   differences between the committing machine and CI. Don't revert to string
   equality.

### Live grid sources run in CI only
`EIA_API_KEY` (us-east/PJM) and `ELECTRICITYMAPS_API_KEY` are repository secrets,
injected only into the `pipeline-refresh` workflow — never readable locally. So:
- Locally and in the offline golden, `grid_source` is `annual_factor` (the eGRID
  fallback). This is correct, not a bug.
- `grid_source` flips to `eia_live` / `electricity_maps_live` only in keyed CI
  runs. To verify the live path, dispatch `pipeline.yml` on your branch and
  inspect the committed snapshot's `grid_source`.

### Capability scores (efficiency frontier)
`data/model_capability.yaml` is a **pinned, cited snapshot** of the Artificial
Analysis Intelligence Index v4.1, taken at each model's **maximum reasoning
effort** (source `Q-AAII-V41`). The index drifts weekly — refresh deliberately,
transcribe published values, never estimate. The 2026 model roster
(`claude-4.8-opus`, `gpt-5.5`, `deepseek-v4-*`, `minimax-m3`, `gemini-3.5-flash`)
is real and AA publishes scores for it — no need to re-check whether it's fictional.

### Agent / cheap-model + Grok review workflow (for data+UI+secret tasks)
This project is frequently developed via the automation rig (cheap models in isolated worktrees + Grok as reviewer/integrator). Successful pattern observed on EIA + efficiency-frontier (2026-06-18/19):
- User (or prior agent) supplies TaskSpec + all credibility-critical numbers (EIA factors sourced by search, AA snapshot transcribed by reviewer). Cheap model only wires code + mocks.
- One worktree per feature (no shared golden / manifest / verify.py / sources.yaml overlap during parallel work).
- Cheap model lands feature branch + PR; full suite + ruff green on the branch.
- Grok lane: reviews, performs conflict-aware integration (order matters: verify fixes before anything touching the gate or goldens), regenerates golden+manifest+web data in one commit, runs live-CI verification for secrets, captures findings into this "Operational gotchas" section.
- Live secret paths (EIA_API_KEY, ELECTRICITYMAPS_API_KEY) are never exercised locally; verification = push a throwaway (or the feature branch) + `gh workflow run pipeline.yml --ref <ref>` + inspect the auto-committed snapshot.
- After integration, update stale PR bodies and post evidence. Prefer GitHub merges for history; local merge + regen is used only for validation.
Worktree leftovers (`projects/lci-wt-*`) are useful audit artifacts but should be pruned after closeout.
Future TaskSpecs for similar work must explicitly call out "CI-only live path + throwaway dispatch for verification" and "Grok will own the final docs + evidence capture".
