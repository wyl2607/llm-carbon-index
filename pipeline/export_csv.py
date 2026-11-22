"""Export `data/output/latest.json` models to CSV on stdout.

Usage: uv run python -m pipeline.export_csv > models.csv

Columns are taken verbatim from latest.json: slug, display_name, origin,
open_or_closed, total_tokens, co2_kg_total.{low,mid,high}, energy_source,
grid_source, flags. A missing co2_kg_total is written as an empty field,
never as 0. Multiple flags are joined with "|".
"""

from __future__ import annotations

import csv
import json
import sys
from typing import Any, TextIO

from pipeline.config import OUTPUT_LATEST_PATH

COLUMNS = (
    "slug",
    "display_name",
    "origin",
    "open_or_closed",
    "total_tokens",
    "co2_kg_total.low",
    "co2_kg_total.mid",
    "co2_kg_total.high",
    "energy_source",
    "grid_source",
    "flags",
)


def _field(model: dict[str, Any], key: str) -> Any:
    value = model.get(key)
    return "" if value is None else value


def _co2_band(model: dict[str, Any], band: str) -> Any:
    co2 = model.get("co2_kg_total")
    if not isinstance(co2, dict):
        return ""
    value = co2.get(band)
    return "" if value is None else value


def iter_rows(doc: dict[str, Any]):
    """Yield one CSV row per entry in doc["models"]."""
    for model in doc.get("models", []):
        yield [
            _field(model, "slug"),
            _field(model, "display_name"),
            _field(model, "origin"),
            _field(model, "open_or_closed"),
            _field(model, "total_tokens"),
            _co2_band(model, "low"),
            _co2_band(model, "mid"),
            _co2_band(model, "high"),
            _field(model, "energy_source"),
            _field(model, "grid_source"),
            "|".join(model.get("flags") or []),
        ]


def write_csv(doc: dict[str, Any], out: TextIO) -> None:
    """Write the header and one row per model to out."""
    writer = csv.writer(out, lineterminator="\n")
    writer.writerow(COLUMNS)
    writer.writerows(iter_rows(doc))


def main() -> None:
    with open(OUTPUT_LATEST_PATH, encoding="utf-8") as f:
        doc = json.load(f)
    write_csv(doc, sys.stdout)


if __name__ == "__main__":
    main()
