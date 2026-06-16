"""Phase 6H: reproducibility harness — run manifest (checksums + metadata).

Pure checksum + manifest assembly per the contract called by the snapshot/verify
orchestrator (owned by the parallel worker). See DATA_SCHEMAS.md §7 for the
canonical `data/output/manifest.json` shape.

Snapshots under `data/raw/snapshots/{D}/` (openrouter.json, grid/*.json, resolved.json)
are the *inputs* to a run for `data_date D`; they are never published artifacts and
carry no secrets/auth headers. The manifest records sha256: digests so a third party
can verify bit-for-bit reproducibility of a committed `data/output/history/{D}.json`.

No I/O at import time. No secrets. Deterministic writes (insertion order for field
sequence; explicit sort only on the documented `inputs` sub-dict and the top-level
runs list by data_date).
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path


def sha256_file(path: Path) -> str:
    """Return "sha256:" + hex digest of the file's bytes (streamed, 64KB chunks)."""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while True:
            chunk = f.read(65536)
            if not chunk:
                break
            h.update(chunk)
    return "sha256:" + h.hexdigest()


def build_run_entry(
    *,
    data_date: str,
    code_git_sha: str,
    methodology_version: str,
    inputs: dict[str, Path],
    output_path: Path,
    tool_versions: dict[str, str],
) -> dict:
    """Assemble one manifest run entry.

    `inputs` maps a snapshot-relative name (e.g. "openrouter.json",
    "grid/us-east.json") to the file Path. Returns a dict with keys:
    data_date, code_git_sha, methodology_version, tool_versions,
    inputs (name -> sha256_file(path)), output_sha256 (sha256_file(output_path)).
    The inputs dict in the result has keys sorted by name for determinism.
    """
    # Build inputs map with keys sorted (documented requirement)
    input_shas: dict[str, str] = {}
    for name in sorted(inputs.keys()):
        input_shas[name] = sha256_file(inputs[name])

    # Construct top-level dict in documented field order (insertion order preserved on write)
    entry: dict = {
        "data_date": data_date,
        "code_git_sha": code_git_sha,
        "methodology_version": methodology_version,
        "tool_versions": tool_versions,
        "inputs": input_shas,
        "output_sha256": sha256_file(output_path),
    }
    return entry


def load_manifest(path: Path) -> dict:
    """Return {"runs": [...]} from the JSON file, or {"runs": []} if missing/unparsable."""
    try:
        if not path.exists():
            return {"runs": []}
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, dict) and isinstance(data.get("runs"), list):
            return data
        return {"runs": []}
    except Exception:
        return {"runs": []}


def upsert_run(entry: dict, manifest_path: Path) -> None:
    """Load manifest, replace the run with the same data_date (or append), sort runs by
    data_date ascending, write JSON with indent=2 + trailing newline. Create parent dir
    if needed. Deterministic output (stable key order via the dict insertion order above;
    do NOT use sort_keys, to preserve the documented field order).
    """
    manifest = load_manifest(manifest_path)
    runs: list[dict] = list(manifest.get("runs", [])) if isinstance(manifest, dict) else []

    data_date = entry.get("data_date")
    # Replace any prior entry for the exact data_date (re-run semantics)
    runs = [r for r in runs if isinstance(r, dict) and r.get("data_date") != data_date]
    runs.append(entry)

    # Sort by data_date ascending (string ISO dates sort lexicographically == chronologically)
    runs.sort(key=lambda r: str(r.get("data_date", "")) if isinstance(r, dict) else "")

    out: dict = {"runs": runs}

    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
        f.write("\n")
