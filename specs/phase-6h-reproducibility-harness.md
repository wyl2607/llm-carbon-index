# specs/phase-6h-reproducibility-harness.md — Reproducibility & verification harness

## Objective
Let a third party **reproduce and verify** any published figure from frozen inputs. Snapshot the exact upstream responses used for a run, make the pipeline deterministic, golden-file the output, and ship a `verify` command plus a checksummed run manifest. This is the *验证形式* (form of verification): the project becomes falsifiable, not merely transparent.

## Prerequisites
6G done. Read `ENGINEERING_STANDARDS.md` §5 (golden file, offline tests).

## Tasks
1. **Input snapshots:** when the pipeline runs for `data_date D`, persist the raw inputs actually used under `data/raw/snapshots/{D}/` — `openrouter.json` (the rankings response) and `grid/{region}.json` (each Electricity Maps response, or the annual-factor record used as fallback), plus `resolved.json` capturing which `data/**/*.yaml` versions (repo git SHA) fed the run. **Secrets/auth headers never written.**
2. **Determinism:** given a snapshot, the pipeline produces byte-identical output except the volatile `generated_at`. Sort keys, fix float formatting, no wall-clock or RNG in the math path. (If 6K adds Monte Carlo, it must be seeded.)
3. `pipeline/verify.py` + `make verify` (i.e. `python -m pipeline.verify {D}`): re-run from `snapshots/{D}/` and assert the result matches the committed `data/output/history/{D}.json` (ignoring `generated_at`). **Non-zero exit on mismatch, with a diff.**
4. **Run manifest:** `data/output/manifest.json` — per published `data_date`: `sha256` of each snapshot input, the code git SHA, `methodology_version`, tool/lib versions, and the output `sha256`. Append-only across dates.
5. `docs/methodology.md` + `README.md` — a "Reproduce & verify" section: clone, install **pinned** deps, `make verify {date}`, expect `PASS`. Pin deps (lockfile / hashes in `pyproject`).

## Interfaces & schemas
`manifest.json` (`DATA_SCHEMAS.md` new §7):
```jsonc
{ "runs": [ {
  "data_date": "2026-06-14",
  "code_git_sha": "…",
  "methodology_version": "0.3.0",
  "inputs": { "openrouter.json": "sha256:…", "grid/us-east.json": "sha256:…" },
  "output_sha256": "sha256:…"
} ] }
```
Snapshots are **inputs**, not published artifacts; they may be large — document a retention policy (keep last N days in-repo; archive older).

## Test requirements
- **Determinism:** run the pipeline twice on one fixture snapshot → identical output (minus `generated_at`).
- **Verify-pass / verify-fail:** `verify` returns 0 on an untouched golden; mutate one committed output number → `verify` returns non-zero with a diff.
- **Checksum integrity:** `manifest.inputs` sha256 match the bytes in `snapshots/{D}/`.
- **Offline:** verify runs entirely from snapshots; no live calls.
- **No secrets:** assert API keys / auth headers are absent from every snapshot file.

## Acceptance criteria
- [ ] A snapshot is written per run; `make verify {date}` reproduces the committed output and passes.
- [ ] Tampering with a published number makes `verify` fail with a diff.
- [ ] `manifest.json` records input + output checksums and the code SHA.
- [ ] `pytest` green; `ruff` clean; no secret in any snapshot.

## Standards
ENGINEERING_STANDARDS §4 (no secrets in artifacts), §5 (golden/offline), §8.

## Out of scope
Bias/sensitivity analysis (6I/6K). UI changes.

## Definition of Done
ENGINEERING_STANDARDS §8 + acceptance above. Update `specs/INDEX.md`.
