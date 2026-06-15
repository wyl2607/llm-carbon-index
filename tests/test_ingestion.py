"""Phase 1 ingestion tests (offline only).

All external I/O is either:
- served from tests/fixtures/, or
- injected via _requests_get seam, or
- redirected via monkeypatch on pipeline.config paths.

No network calls ever occur during pytest.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

# Make local "pipeline" package importable when running `uv run pytest`
# (matches pattern used by tests/test_prove_math.py for scratch/).
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from pipeline.openrouter import (
    AuthError,
    fetch_rankings_daily,
    normalize,
)
from pipeline.storage import append_normalized
from pipeline.types import NormalizedRecord

FIXTURE_PATH = Path(__file__).parent / "fixtures" / "rankings_daily_sample.json"


def load_sample_raw() -> dict:
    with open(FIXTURE_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def test_normalize_maps_fields_and_retains_other():
    raw = load_sample_raw()
    recs = normalize(raw)
    assert len(recs) == 4

    # All are NormalizedRecord shape
    for r in recs:
        assert isinstance(r, dict)
        assert set(r.keys()) == {"date", "model_slug", "total_tokens", "is_other"}
        assert isinstance(r["date"], str)
        assert isinstance(r["model_slug"], str)
        assert isinstance(r["total_tokens"], int)
        assert isinstance(r["is_other"], bool)

    # The other aggregate must be present and flagged
    others = [r for r in recs if r["is_other"]]
    assert len(others) == 1
    other = others[0]
    assert other["model_slug"] == "other"
    assert other["is_other"] is True
    assert other["total_tokens"] > 0
    assert other["date"] == "2026-06-14"

    # Regular model rows have is_other=False and sensible slugs
    normals = [r for r in recs if not r["is_other"]]
    assert len(normals) == 3
    for n in normals:
        assert n["is_other"] is False
        assert n["model_slug"] != "other"
        assert "/" in n["model_slug"] or n["model_slug"].startswith("other") is False


def test_storage_dedupes_on_date_and_slug_and_stable_order(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
):
    from pipeline import config

    fake_path = tmp_path / "normalized.jsonl"
    monkeypatch.setattr(config, "NORMALIZED_PATH", fake_path, raising=False)

    raw = load_sample_raw()
    recs = normalize(raw)
    assert len(recs) == 4

    # First ingest
    append_normalized(recs)
    content1 = fake_path.read_text(encoding="utf-8").strip()
    lines1 = [ln for ln in content1.splitlines() if ln.strip()]
    assert len(lines1) == 4

    # Second ingest of identical set -> no growth, no dups
    append_normalized(recs)
    content2 = fake_path.read_text(encoding="utf-8").strip()
    lines2 = [ln for ln in content2.splitlines() if ln.strip()]
    assert len(lines2) == 4

    # Parse back and verify dedupe + order: other is last for the date
    parsed: list[NormalizedRecord] = [json.loads(ln) for ln in lines2]
    dates = {p["date"] for p in parsed}
    assert dates == {"2026-06-14"}

    # Within date: last must be the other (because we sort is_other asc then slug)
    last = parsed[-1]
    assert last["is_other"] is True
    assert last["model_slug"] == "other"

    # No duplicate keys
    keys = [(p["date"], p["model_slug"]) for p in parsed]
    assert len(keys) == len(set(keys))


def test_cache_hit_skips_api_client(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    from pipeline import config

    # Redirect raw dir into test temp so we do not touch real tree
    fake_raw_dir = tmp_path / "openrouter_raw"
    monkeypatch.setattr(config, "OPENROUTER_RAW_DIR", fake_raw_dir, raising=False)

    sample = load_sample_raw()
    cache_date = "2026-06-14"
    cache_file = fake_raw_dir / f"{cache_date}.json"
    cache_file.parent.mkdir(parents=True, exist_ok=True)
    cache_file.write_text(json.dumps(sample), encoding="utf-8")

    calls = {"count": 0}

    def spy_get(*args: object, **kwargs: object) -> None:  # signature loose on purpose
        calls["count"] += 1
        raise AssertionError("fetcher must not be invoked on cache hit")

    # Should hit cache and never call the getter
    raw = fetch_rankings_daily(cache_date, _requests_get=spy_get)
    assert calls["count"] == 0
    assert raw == sample

    # Sanity: the normalized form from cached raw is still correct
    recs = normalize(raw)
    assert any(r["is_other"] for r in recs)


def test_fetch_miss_uses_injected_getter_and_writes_cache(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
):
    from pipeline import config

    fake_raw_dir = tmp_path / "openrouter_raw2"
    monkeypatch.setattr(config, "OPENROUTER_RAW_DIR", fake_raw_dir, raising=False)
    # Provide a dummy key so the live-path guard passes; the injected getter is still used
    # and no real network happens.
    monkeypatch.setattr(config, "openrouter_api_key", lambda: "test-dummy-key", raising=False)

    sample = load_sample_raw()
    call_log: list[dict] = []

    def fake_get(
        url: str,
        headers: dict | None = None,
        params: dict | None = None,
        timeout: int | None = None,
    ):
        call_log.append({"url": url, "headers": headers, "params": params})
        # Return a minimal response-like with .json() and .status_code
        class Resp:
            status_code = 200

            def json(self):
                return sample

        return Resp()

    # Force miss: use a date with no prior cache
    target = "2026-06-13"
    raw = fetch_rankings_daily(target, _requests_get=fake_get)
    assert raw == sample
    assert len(call_log) == 1
    # Auth header present (injection bypasses key read for this test)
    assert "Authorization" in call_log[0]["headers"]
    assert call_log[0]["headers"]["Authorization"].startswith("Bearer ")

    # Cache should have been written under the pinned date name
    written = fake_raw_dir / f"{target}.json"
    assert written.exists()
    assert json.loads(written.read_text(encoding="utf-8")) == sample


def test_auth_error_on_missing_key(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    from pipeline import config

    # Redirect cache dir; force key absent -> AuthError on miss
    fake_raw = tmp_path / "raw_or_auth"
    monkeypatch.setattr(config, "OPENROUTER_RAW_DIR", fake_raw, raising=False)
    monkeypatch.setattr(config, "openrouter_api_key", lambda: None, raising=False)

    with pytest.raises(AuthError):
        fetch_rankings_daily("2026-01-01")  # cache miss + no key => AuthError


def test_normalize_preserves_large_token_counts():
    # Exercise the int-from-str path with a value >> 2^53 (json number safety)
    raw = {
        "data": [
            {
                "date": "2026-06-14",
                "model_permaslug": "other",
                "total_tokens": "12345678901234567890",
            }
        ],
        "meta": {
            "as_of": "x",
            "end_date": "2026-06-14",
            "start_date": "2026-06-14",
            "version": "v1",
        },
    }
    recs = normalize(raw)
    assert recs[0]["total_tokens"] == 12345678901234567890
    assert isinstance(recs[0]["total_tokens"], int)
