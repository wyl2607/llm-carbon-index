"""Phase 6H: reproduce a published run from its frozen snapshot and verify it.

`python -m pipeline.verify [data_date ...]` (also `make verify {date}`) re-runs the
pipeline strictly from `data/raw/snapshots/{D}/` — no network — and asserts the result
matches the committed `data/output/history/{D}.json`, ignoring only the volatile
`generated_at`. Exit 0 on PASS; non-zero with a diff on any mismatch. With no date, every
committed history snapshot is verified.
"""
from __future__ import annotations

import difflib
import json
import sys

import pipeline.config as config
from pipeline.estimate import estimate
from pipeline.openrouter import normalize
from pipeline.output import build_output
from pipeline.snapshot import grid_replay, load_openrouter, snapshot_dir


def _strip_volatile(doc: dict) -> dict:
    d = dict(doc)
    d.pop("generated_at", None)
    return d


def reproduce(data_date: str) -> dict:
    """Rebuild the output doc for data_date from its frozen snapshot (offline)."""
    raw = load_openrouter(data_date)
    records = normalize(raw)
    day_records = [r for r in records if r["date"] == data_date]
    estimates = estimate(day_records, carbon_intensity_fn=grid_replay(data_date))
    committed = json.loads(
        (config.OUTPUT_HISTORY_DIR / f"{data_date}.json").read_text(encoding="utf-8")
    )
    # Reuse the committed generated_at so the only legitimate difference is eliminated.
    return build_output(estimates, day_records, data_date, generated_at=committed["generated_at"])


def verify_date(data_date: str) -> bool:
    """Return True if the reproduced doc matches the committed history (minus generated_at)."""
    hist_path = config.OUTPUT_HISTORY_DIR / f"{data_date}.json"
    if not snapshot_dir(data_date).exists():
        print(f"FAIL {data_date}: no snapshot at {snapshot_dir(data_date)}")
        return False
    if not hist_path.exists():
        print(f"FAIL {data_date}: no committed output at {hist_path}")
        return False

    committed = json.loads(hist_path.read_text(encoding="utf-8"))
    reproduced = reproduce(data_date)

    a = json.dumps(_strip_volatile(committed), indent=2, sort_keys=True).splitlines()
    b = json.dumps(_strip_volatile(reproduced), indent=2, sort_keys=True).splitlines()
    if a == b:
        print(f"PASS {data_date}")
        return True

    print(f"FAIL {data_date}: reproduced output differs from committed golden:")
    diff = difflib.unified_diff(a, b, fromfile="committed", tofile="reproduced", lineterm="")
    for i, line in enumerate(diff):
        if i > 60:
            print("  ... (diff truncated)")
            break
        print("  " + line)
    return False


def _all_dates() -> list[str]:
    if not config.OUTPUT_HISTORY_DIR.exists():
        return []
    return sorted(p.stem for p in config.OUTPUT_HISTORY_DIR.glob("*.json"))


def main(argv: list[str] | None = None) -> int:
    args = list(sys.argv[1:] if argv is None else argv)
    dates = args or _all_dates()
    if not dates:
        print("verify: no dates to check (no history snapshots).")
        return 0
    ok = True
    for d in dates:
        ok = verify_date(d) and ok
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
