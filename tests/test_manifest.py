"""Phase 6H tests for pipeline/manifest.py (reproducibility manifest + checksums).

Offline only. Covers the pure functions per the contract in the phase spec and
the caller's expectations (build_run_entry, upsert semantics, load fallback,
sha256 streaming + prefix).
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

# Make local "pipeline" package importable when running `uv run pytest`
# (matches pattern used by tests/test_provenance.py and tests/test_ingestion.py).
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from pipeline.manifest import (
    build_run_entry,
    load_manifest,
    sha256_file,
    upsert_run,
)


def test_sha256_file_prefix_and_matches_hashlib(tmp_path: Path):
    """sha256_file returns 'sha256:' + hex and matches hashlib on the bytes."""
    p = tmp_path / "sample.bin"
    data = b"hello reproducibility 6H\nwith multiple\nlines and \x00 bytes"
    p.write_bytes(data)

    got = sha256_file(p)
    assert got.startswith("sha256:")
    expected = "sha256:" + hashlib.sha256(data).hexdigest()
    assert got == expected

    # Also empty file edge
    empty = tmp_path / "empty"
    empty.write_bytes(b"")
    got_empty = sha256_file(empty)
    assert got_empty == "sha256:" + hashlib.sha256(b"").hexdigest()


def test_build_run_entry_keys_and_sorted_inputs(tmp_path: Path):
    """build_run_entry: documented keys, hashed inputs, inputs sub-dict sorted by name."""
    # Prepare input snapshot files under a temp "snapshot" tree
    snap = tmp_path / "snap"
    snap.mkdir()
    grid_dir = snap / "grid"
    grid_dir.mkdir()
    or_path = snap / "openrouter.json"
    grid_path = grid_dir / "us-east.json"
    or_path.write_text('{"rankings": []}', encoding="utf-8")
    grid_path.write_text('{"carbon_intensity": 123}', encoding="utf-8")

    out_path = tmp_path / "out.json"
    out_path.write_text('{"ok": true}', encoding="utf-8")

    # Pass inputs with deliberately non-alpha order to test sort
    inputs = {
        "grid/us-east.json": grid_path,
        "openrouter.json": or_path,
    }

    entry = build_run_entry(
        data_date="2026-06-14",
        code_git_sha="abc123def",
        methodology_version="0.4.0",
        inputs=inputs,
        output_path=out_path,
        tool_versions={"python": "3.11.9", "ecologits": "0.5.0"},
    )

    # Documented top-level keys in order
    assert list(entry.keys()) == [
        "data_date",
        "code_git_sha",
        "methodology_version",
        "tool_versions",
        "inputs",
        "output_sha256",
    ]

    assert entry["data_date"] == "2026-06-14"
    assert entry["code_git_sha"] == "abc123def"
    assert entry["methodology_version"] == "0.4.0"
    assert entry["tool_versions"] == {"python": "3.11.9", "ecologits": "0.5.0"}

    # inputs hashed and keys sorted alpha by name
    assert isinstance(entry["inputs"], dict)
    assert list(entry["inputs"].keys()) == sorted(inputs.keys())
    assert entry["inputs"]["openrouter.json"].startswith("sha256:")
    assert entry["inputs"]["grid/us-east.json"].startswith("sha256:")
    # Verify content match
    assert entry["inputs"]["openrouter.json"] == sha256_file(or_path)
    assert entry["inputs"]["grid/us-east.json"] == sha256_file(grid_path)

    assert entry["output_sha256"].startswith("sha256:")
    assert entry["output_sha256"] == sha256_file(out_path)


def test_upsert_run_appends_replaces_and_sorts_by_date(tmp_path: Path):
    """upsert_run: appends, replaces same data_date (no dups), runs sorted by date asc."""
    mpath = tmp_path / "output" / "manifest.json"

    entry1 = {
        "data_date": "2026-06-14",
        "code_git_sha": "shaA",
        "methodology_version": "0.4.0",
        "tool_versions": {"python": "3.11"},
        "inputs": {"openrouter.json": "sha256:aaa"},
        "output_sha256": "sha256:zzz",
    }
    upsert_run(entry1, mpath)

    loaded = json.loads(mpath.read_text(encoding="utf-8"))
    assert loaded == {"runs": [entry1]}
    assert mpath.read_text(encoding="utf-8").endswith("\n")

    # Append an earlier date
    entry0 = {
        "data_date": "2026-06-13",
        "code_git_sha": "sha0",
        "methodology_version": "0.4.0",
        "tool_versions": {"python": "3.11"},
        "inputs": {"openrouter.json": "sha256:000"},
        "output_sha256": "sha256:yyy",
    }
    upsert_run(entry0, mpath)

    loaded = json.loads(mpath.read_text(encoding="utf-8"))
    dates = [r["data_date"] for r in loaded["runs"]]
    assert dates == ["2026-06-13", "2026-06-14"]  # sorted asc

    # Re-run same date 2026-06-14 with new SHA -> replace, no duplicate, still sorted
    entry1b = {
        "data_date": "2026-06-14",
        "code_git_sha": "shaB",
        "methodology_version": "0.4.0",
        "tool_versions": {"python": "3.11"},
        "inputs": {"openrouter.json": "sha256:aaa2"},
        "output_sha256": "sha256:zzz2",
    }
    upsert_run(entry1b, mpath)

    loaded = json.loads(mpath.read_text(encoding="utf-8"))
    assert len(loaded["runs"]) == 2
    dates = [r["data_date"] for r in loaded["runs"]]
    assert dates == ["2026-06-13", "2026-06-14"]
    # The later entry for 14 wins
    run14 = next(r for r in loaded["runs"] if r["data_date"] == "2026-06-14")
    assert run14["code_git_sha"] == "shaB"
    assert run14["output_sha256"] == "sha256:zzz2"

    # Add a future date; final order must remain chronological
    entry2 = {
        "data_date": "2026-06-15",
        "code_git_sha": "sha2",
        "methodology_version": "0.4.0",
        "tool_versions": {"python": "3.11"},
        "inputs": {"openrouter.json": "sha256:bbb"},
        "output_sha256": "sha256:xxx",
    }
    upsert_run(entry2, mpath)

    loaded = json.loads(mpath.read_text(encoding="utf-8"))
    dates = [r["data_date"] for r in loaded["runs"]]
    assert dates == ["2026-06-13", "2026-06-14", "2026-06-15"]


def test_load_manifest_missing_returns_empty(tmp_path: Path):
    """load_manifest returns {"runs": []} for a missing file (and for unparsable)."""
    missing = tmp_path / "no" / "such" / "manifest.json"
    assert load_manifest(missing) == {"runs": []}

    # Unparsable also falls back (create a bad file)
    bad = tmp_path / "bad.json"
    bad.write_text("{not valid json", encoding="utf-8")
    assert load_manifest(bad) == {"runs": []}

    # A valid but wrong shape also -> empty
    wrong = tmp_path / "wrong.json"
    wrong.write_text('{"foo": 1}', encoding="utf-8")
    assert load_manifest(wrong) == {"runs": []}
