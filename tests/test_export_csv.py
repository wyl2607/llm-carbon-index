"""Tests for pipeline/export_csv.py."""
from __future__ import annotations

import csv
import io
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pipeline.export_csv as export_csv

LATEST = Path(__file__).resolve().parents[1] / "data" / "output" / "latest.json"


def _rows(doc: dict) -> list[list[str]]:
    buf = io.StringIO()
    export_csv.write_csv(doc, buf)
    return list(csv.reader(io.StringIO(buf.getvalue())))


def test_latest_json_row_count_and_header():
    doc = json.loads(LATEST.read_text(encoding="utf-8"))
    rows = _rows(doc)
    assert rows[0] == list(export_csv.COLUMNS)
    assert len(rows) == len(doc["models"]) + 1


def test_missing_co2_total_is_blank_not_zero():
    doc = {
        "models": [
            {
                "slug": "example/model",
                "display_name": "Example",
                "origin": "US",
                "open_or_closed": "open",
                "total_tokens": 1,
                "energy_source": "measured",
                "grid_source": "annual_factor",
                "flags": ["A", "B"],
            }
        ]
    }
    rows = _rows(doc)
    assert rows[1][5:8] == ["", "", ""]
    assert rows[1][-1] == "A|B"
