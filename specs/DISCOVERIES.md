# DISCOVERIES — running log of findings that change how phases must be built

> Synced into `files (1).zip` after each phase, per standing instruction.
> Repo: `~/projects/llm-carbon-index` (phases committed straight to `main`).

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
