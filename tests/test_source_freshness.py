"""Unit tests for static-source age policy (no live network)."""

from __future__ import annotations

from datetime import date

from pipeline.config import ELECTRICITYMAPS_BASE_URL
from pipeline.source_freshness import (
    check_registry_ages,
    find_stale_static_sources,
)


def test_electricitymaps_base_url_is_v4():
    assert ELECTRICITYMAPS_BASE_URL == "https://api.electricitymaps.com/v4"


def test_registry_marks_aa_stale_after_max_age():
    sources = [
        {
            "id": "Q-AAII-V41",
            "title": "Artificial Analysis Intelligence Index",
            "accessed": "2026-01-01",
        },
        {
            "id": "E-AES-EXAMPLE",
            "title": "AI Energy Score v2 example",
            "accessed": "2026-01-01",
        },
        {
            "id": "GRID-EM-LIVE",
            "title": "Electricity Maps API",
            "accessed": "2020-01-01",  # not in volatile policy by id
        },
    ]
    stale = check_registry_ages(sources, today=date(2026, 7, 29))
    ids = {s.source_id for s in stale}
    assert "Q-AAII-V41" in ids
    assert "E-AES-EXAMPLE" in ids
    assert "GRID-EM-LIVE" not in ids


def test_registry_accepts_fresh_aa():
    sources = [
        {
            "id": "Q-AAII-V41",
            "title": "AA",
            "accessed": "2026-07-20",
        }
    ]
    assert check_registry_ages(sources, today=date(2026, 7, 29)) == []


def test_find_stale_static_sources_runs_on_repo(tmp_path, monkeypatch):
    # Smoke: function returns a list (may be empty or stale depending on calendar).
    result = find_stale_static_sources(today=date(2026, 7, 29))
    assert isinstance(result, list)
