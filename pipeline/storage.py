"""Storage for normalized ingestion records (jsonl append + dedupe).

Appends Phase-1 NormalizedRecords to NORMALIZED_PATH (data/raw/normalized.jsonl).
Dedupes on the natural key (date, model_slug). Produces stable ordering:
date asc, then non-other before other, then model_slug alpha within groups.
"""

from __future__ import annotations

import json

import pipeline.config as config
from pipeline.types import NormalizedRecord


def append_normalized(records: list[NormalizedRecord]) -> None:
    """Merge records into the jsonl store with dedupe and stable sort.

    Idempotent: calling with the same (date, model_slug) set multiple times
    results in no duplicate lines. Existing records on disk are preserved
    for other dates. Newer values for a key win (in case of any correction ingest).
    """
    norm_path = config.NORMALIZED_PATH
    norm_path.parent.mkdir(parents=True, exist_ok=True)

    existing: list[NormalizedRecord] = []
    if norm_path.exists():
        with open(norm_path, "r", encoding="utf-8") as f:
            for line in f:
                stripped = line.strip()
                if stripped:
                    existing.append(json.loads(stripped))

    # Dedupe via (date, model_slug) key; later records override for same key.
    deduped: dict[tuple[str, str], NormalizedRecord] = {}
    for rec in existing:
        key = (rec["date"], rec["model_slug"])
        deduped[key] = rec
    for rec in records:
        key = (rec["date"], rec["model_slug"])
        deduped[key] = rec

    # Stable ordering: chronological, other rows last within each date.
    ordered = sorted(
        deduped.values(),
        key=lambda r: (r["date"], r["is_other"], r["model_slug"]),
    )

    # Rewrite atomically enough for our purposes (small file).
    with open(norm_path, "w", encoding="utf-8") as f:
        for rec in ordered:
            # sort_keys + no spaces for deterministic output
            f.write(json.dumps(rec, ensure_ascii=False, sort_keys=True) + "\n")
