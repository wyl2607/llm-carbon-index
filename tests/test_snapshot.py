"""Phase 6H tests for pipeline/snapshot.py + manifest integrity.

Offline only. Covers the spec's Test requirements:
  - no secrets: the snapshot writer never persists API keys / auth headers,
    even when a key is present in the environment;
  - checksum integrity: the committed manifest's sha256 digests match the bytes
    of the committed snapshot inputs and the published output.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pipeline.config as config  # noqa: E402
from pipeline.manifest import sha256_file  # noqa: E402
from pipeline.snapshot import write_snapshot  # noqa: E402

DATE = "2026-06-14"
SECRET_MARKERS = ("api_key", "apikey", "authorization", "bearer", "x-api-key", "secret")


def test_writer_never_persists_env_secret(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    sentinel = "sk-SECRET-SENTINEL-DO-NOT-PERSIST"
    monkeypatch.setenv("OPENROUTER_API_KEY", sentinel)
    monkeypatch.setattr(config, "SNAPSHOTS_DIR", tmp_path / "snapshots")

    raw = {"data": [{"date": DATE, "model_permaslug": "openai/gpt-4o", "total_tokens": "100"}]}
    estimates = [
        {
            "region": "us-east",
            "carbon_intensity_gco2_kwh": 350.0,
            "grid_source": "annual_factor",
            "grid_source_id": "C-GRID-US-EAST-350",
        }
    ]
    inputs = write_snapshot(DATE, raw, estimates, "0.4.0")

    for path in inputs.values():
        text = path.read_text(encoding="utf-8")
        assert sentinel not in text, f"env secret leaked into {path.name}"
        low = text.lower()
        for marker in SECRET_MARKERS:
            assert marker not in low, f"secret-shaped key {marker!r} in {path.name}"


def test_committed_snapshot_has_no_secret_shaped_keys() -> None:
    snap_dir = config.SNAPSHOTS_DIR / DATE
    files = list(snap_dir.rglob("*.json"))
    assert files, "committed snapshot missing"
    for path in files:
        low = path.read_text(encoding="utf-8").lower()
        for marker in SECRET_MARKERS:
            assert marker not in low, f"secret-shaped key {marker!r} in committed {path}"


def test_manifest_checksums_match_committed_bytes() -> None:
    manifest = json.loads(config.MANIFEST_PATH.read_text(encoding="utf-8"))
    run = next(r for r in manifest["runs"] if r["data_date"] == DATE)

    snap_dir = config.SNAPSHOTS_DIR / DATE
    for name, digest in run["inputs"].items():
        assert sha256_file(snap_dir / name) == digest, f"manifest digest stale for {name}"

    output_path = config.OUTPUT_HISTORY_DIR / f"{DATE}.json"
    assert sha256_file(output_path) == run["output_sha256"], "manifest output digest stale"
