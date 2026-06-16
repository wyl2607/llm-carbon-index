"""Phase 6H: frozen input snapshots for reproducible runs.

A run for ``data_date D`` persists the exact raw inputs it used under
``data/raw/snapshots/{D}/`` so a third party can reproduce the published output
offline (``pipeline.verify``):

  - ``openrouter.json``   the rankings response actually used
  - ``grid/{region}.json``  the resolved grid figure per region (live value, or the
                            annual-factor record used as fallback)
  - ``resolved.json``     the repo git SHA + methodology version that fed the run

Secrets / auth headers are NEVER written: only response *bodies* and resolved values
are snapshotted, never request headers or keys.
"""
from __future__ import annotations

import json
import subprocess
from collections.abc import Callable
from pathlib import Path

import pipeline.config as config
from pipeline.types import ModelEstimate


def code_git_sha() -> str:
    """Current repo HEAD SHA (pins which data/**/*.yaml versions fed the run)."""
    try:
        out = subprocess.run(  # noqa: S603 - fixed args, no user input; git on PATH (S607)
            ["git", "rev-parse", "HEAD"],  # noqa: S607
            cwd=str(config.REPO_ROOT),
            capture_output=True,
            text=True,
            timeout=10,
        )
        sha = out.stdout.strip()
        return sha or "unknown"
    except Exception:
        return "unknown"


def snapshot_dir(data_date: str) -> Path:
    return config.SNAPSHOTS_DIR / data_date


def _write_json(path: Path, obj: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2, sort_keys=True)
        f.write("\n")


def write_snapshot(
    data_date: str,
    raw_openrouter: dict,
    estimates: list[ModelEstimate],
    methodology_version: str,
) -> dict[str, Path]:
    """Persist the run's frozen inputs; return {snapshot-relative name: Path} for the manifest.

    The grid snapshot is derived from the resolved per-region figures the run used
    (deduped by region), so replay reconstructs identical carbon intensities without
    any network call.
    """
    d = snapshot_dir(data_date)
    inputs: dict[str, Path] = {}

    # 1. raw OpenRouter rankings response (body only — no headers/keys)
    or_path = d / "openrouter.json"
    _write_json(or_path, raw_openrouter)
    inputs["openrouter.json"] = or_path

    # 2. resolved grid figure per distinct region
    seen: dict[str, dict] = {}
    for m in estimates:
        region = m["region"]
        if region not in seen:
            seen[region] = {
                "region": region,
                "gco2_per_kwh": m["carbon_intensity_gco2_kwh"],
                "grid_source": m["grid_source"],
                "source_id": m["grid_source_id"],
            }
    for region, rec in sorted(seen.items()):
        gp = d / "grid" / f"{region}.json"
        _write_json(gp, rec)
        inputs[f"grid/{region}.json"] = gp

    # 3. resolved versions (pins yaml provenance via repo SHA)
    resolved_path = d / "resolved.json"
    _write_json(
        resolved_path,
        {
            "data_date": data_date,
            "code_git_sha": code_git_sha(),
            "methodology_version": methodology_version,
            "data_dir": "data/",
        },
    )
    inputs["resolved.json"] = resolved_path

    return inputs


def load_openrouter(data_date: str) -> dict:
    """Read the frozen rankings response for a snapshot date."""
    with open(snapshot_dir(data_date) / "openrouter.json", encoding="utf-8") as f:
        return json.load(f)


def grid_replay(data_date: str) -> Callable[[str], tuple[float, str, str]]:
    """Build a deterministic carbon_intensity replacement from the frozen grid snapshot.

    Returns a function region -> (gco2_per_kwh, grid_source, source_id) reading only
    the committed snapshot files (no network), matching the live signature.
    """
    table: dict[str, tuple[float, str, str]] = {}
    grid_dir = snapshot_dir(data_date) / "grid"
    for gp in sorted(grid_dir.glob("*.json")):
        with open(gp, encoding="utf-8") as f:
            rec = json.load(f)
        table[rec["region"]] = (
            float(rec["gco2_per_kwh"]),
            rec["grid_source"],
            rec["source_id"],
        )

    def _lookup(region: str) -> tuple[float, str, str]:
        if region not in table:
            raise KeyError(f"region {region!r} absent from snapshot {data_date}")
        return table[region]

    return _lookup
