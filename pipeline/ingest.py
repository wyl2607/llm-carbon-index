"""CLI entry point for Phase 1 ingestion.

Usage:
  python -m pipeline.ingest --date latest
  python -m pipeline.ingest --date 2026-06-14
"""

from __future__ import annotations

import argparse
import sys

from pipeline.openrouter import fetch_rankings_daily, normalize
from pipeline.storage import append_normalized


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="pipeline.ingest",
        description=(
            "Fetch OpenRouter rankings-daily (or serve from cache), "
            "normalize, and append to the deduped time series."
        ),
    )
    parser.add_argument(
        "--date",
        default="latest",
        help='Date in YYYY-MM-DD or "latest" (server default recent window). Default: latest',
    )
    args = parser.parse_args(argv)

    try:
        raw = fetch_rankings_daily(args.date)
        records = normalize(raw)
        append_normalized(records)
        # Minimal observable output for operator / CI logs (no secrets).
        # The actual data_date(s) live in the written records and raw cache meta.
        print(f"ingest: wrote {len(records)} normalized records (date arg={args.date})")
        return 0
    except Exception as exc:  # surface typed errors cleanly
        print(f"ingest error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
