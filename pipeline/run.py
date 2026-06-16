"""CLI entrypoint for the pipeline (Phase 3).

python -m pipeline.run [--date latest|YYYY-MM-DD]

Orchestrates: fetch (with cache) -> normalize -> append_normalized (storage)
-> select day records -> estimate -> build_output -> validate -> write_outputs.
"""
from __future__ import annotations

import argparse
import platform
from datetime import datetime, timezone

import pipeline.config as config
from pipeline import METHODOLOGY_VERSION
from pipeline.estimate import estimate
from pipeline.manifest import build_run_entry, upsert_run
from pipeline.openrouter import fetch_rankings_daily, normalize
from pipeline.output import build_output, write_outputs
from pipeline.snapshot import code_git_sha, write_snapshot
from pipeline.storage import append_normalized


def run(date: str = "latest") -> dict:
    """Execute one pipeline run for the given date key and return the produced doc."""
    raw = fetch_rankings_daily(date)
    records = normalize(raw)
    append_normalized(records)

    # Determine the data_date reflected by this run.
    # - For explicit YYYY-MM-DD: use it (fetch was pinned).
    # - For "latest": pick the most recent date present in the payload
    #   (the fetch may surface a window; we output the freshest day's snapshot).
    if date == "latest":
        if records:
            data_date = max(r["date"] for r in records)
        else:
            data_date = datetime.now(timezone.utc).date().isoformat()
    else:
        data_date = date

    # Filter to the day's records so estimate + totals are coherent for data_date.
    # (append_normalized already received the full payload for multi-day safety.)
    day_records = [r for r in records if r["date"] == data_date]
    estimates = estimate(day_records)

    doc = build_output(estimates, day_records, data_date)
    write_outputs(doc)

    # Phase 6H: freeze the run's raw inputs + record checksums so the published output
    # is independently reproducible (pipeline.verify) and tamper-evident.
    inputs = write_snapshot(data_date, raw, estimates, METHODOLOGY_VERSION)
    entry = build_run_entry(
        data_date=data_date,
        code_git_sha=code_git_sha(),
        methodology_version=METHODOLOGY_VERSION,
        inputs=inputs,
        output_path=config.OUTPUT_HISTORY_DIR / f"{data_date}.json",
        tool_versions={"python": platform.python_version()},
    )
    upsert_run(entry, config.MANIFEST_PATH)
    return doc


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        description="LLM Carbon Index - Phase 3 output assembly runner"
    )
    parser.add_argument(
        "--date",
        default="latest",
        help="Date key for rankings (YYYY-MM-DD or 'latest' for freshest complete day)",
    )
    args = parser.parse_args(argv)
    run(args.date)


if __name__ == "__main__":
    main()
