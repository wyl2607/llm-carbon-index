# DISCOVERIES — running log of findings that change how phases must be built

> Synced into `files (1).zip` after each phase, per standing instruction.
> Repo: `~/projects/llm-carbon-index` (phases committed straight to `main`).

## Phase 6I — fairness & boundary (commit `ef3a4ae`, 2026-06-16)

- **6I code was split across two WIP branches** (`6i-docs` = gemini lane for BOUNDARY.md/FAIRNESS.md;
  `6i-core` = grok lane for pipeline/fairness.py + schema + tests). The branches were staged but
  not committed to main, so INDEX.md still showed ⬜ despite passing pytest. The merge/completion
  step (UI component, methodology.md links, golden re-generation) was the missing piece.
- **Golden must be regenerated when methodology_version bumps.** Adding `totals.fairness` bumped
  the version 0.4.0 → 0.5.0; `make verify` caught the mismatch. Fixed by calling `reproduce(date)`
  from the existing snapshot (offline, no API key) and overwriting the history golden + latest.json.
  `make verify 2026-06-14` → PASS after the regeneration.
- **Three-column honesty banner.** The existing 2-column grid (scope + precision) expanded to 3
  (scope + precision + fairness) in App.tsx. FairnessNote is always-visible and non-dismissable.

### Carry-forward for later phases
- 6J (sourced energy) will change intensity data → **must regenerate golden and snapshot together**
  in one commit (confirmed pattern from 6H DISCOVERIES), or `make verify` will fail.
- `totals.co2_kg` (and peers) are `{min,max}` ranges, not scalars — tests/tamper logic must
  target a scalar field (e.g. `totals.total_tokens`).

## Phase 6H — reproducibility harness (commit `b03fa2c`, 2026-06-16)

- **Published inputs were never committed.** `data/raw/` is fully gitignored and the
  OpenRouter fetch cache was empty, so the exact raw input that produced the published
  50-model `data/output/history/2026-06-14.json` golden was **lost**, and there is no
  API key in-session to re-fetch.
- **The golden is losslessly reconstructable from its own output**: `unmapped_tokens=0`,
  and `totals.total_tokens − Σ(model.total_tokens) = uncovered_tokens` = the "other" row.
  So a faithful `openrouter.json` snapshot = 50 model rows (`slug`→`model_permaslug`,
  `total_tokens`) + one `other` row (`uncovered_tokens`); grid snapshot = each row's
  `{region, carbon_intensity_gco2_kwh, grid_source, grid_source_id}` deduped by region.
- **Decision: backfill, do NOT overwrite.** Reconstructing the snapshot and running
  `make verify 2026-06-14` reproduces the committed output **byte-for-byte**, so the real
  50-model production data is preserved *and* made reproducible — no live fetch, no
  destructive regenerate from the 4-row test fixture.
- **`.gitignore` gotcha:** snapshots must be committed, but git cannot re-include a path
  whose parent dir is wholly excluded. Use `data/raw/*` (not `data/raw/`) + an
  `!data/raw/snapshots/**` exception. The volatile fetch cache stays ignored.
- **`resolved.json` SHA = `57a56f4` (6G)**, correctly pinning the code/yaml versions that
  produced the golden (no data commits since 6G), not the 6H commit.

### Carry-forward for later phases
- Every future `run.py` execution now self-snapshots + upserts the manifest, so this
  lost-input problem cannot recur for new dates.
- 6J (sourced energy) will change estimate outputs → it must **regenerate the golden AND
  its snapshot together** in one commit, or `make verify` will fail.
- `totals.co2_kg` (and peers) are `{min,max}` ranges, not scalars — tests/tamper logic
  must target a scalar field (e.g. `totals.total_tokens`).
