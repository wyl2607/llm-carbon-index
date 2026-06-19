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
import math
import re
import sys

import pipeline.config as config
from pipeline.estimate import estimate
from pipeline.openrouter import normalize
from pipeline.output import build_output
from pipeline.snapshot import grid_replay, load_openrouter, snapshot_dir

# Float reproduction tolerance. The golden replay must be portable across the
# machine that committed a golden and the CI runner: float summation order is
# not associative, so the same inputs yield last-ULP drift (e.g.
# 8171693.203313796 vs ...793). That is a serialization artifact, NOT a
# methodology change — any real drift is orders of magnitude larger than this.
# rel_tol guards large magnitudes; abs_tol guards values at/near zero.
_FLOAT_REL_TOL = 1e-9
_FLOAT_ABS_TOL = 1e-6


def _strip_volatile(doc: dict) -> dict:
    d = dict(doc)
    d.pop("generated_at", None)
    return d


def _docs_equiv(a: object, b: object) -> bool:
    """Structural equality treating floats equal within tolerance, all else exact.

    Bool is compared identically (not as int), so True never equals 1.
    """
    if isinstance(a, bool) or isinstance(b, bool):
        return a is b
    # Integer counts/IDs are exact (not subject to float drift); only compare with
    # tolerance when at least one side is a float aggregate.
    if isinstance(a, int) and isinstance(b, int):
        return a == b
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        return math.isclose(a, b, rel_tol=_FLOAT_REL_TOL, abs_tol=_FLOAT_ABS_TOL)
    if isinstance(a, dict) and isinstance(b, dict):
        return a.keys() == b.keys() and all(_docs_equiv(a[k], b[k]) for k in a)
    if isinstance(a, list) and isinstance(b, list):
        return len(a) == len(b) and all(_docs_equiv(x, y) for x, y in zip(a, b, strict=True))
    return a == b


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

    # L4 guard: methodology_version in goldens MUST match current METHODOLOGY_VERSION.
    # Schema/methodology-affecting changes require bumping + regenerating the golden
    # *and* its snapshot in one commit, or verify fails (and this explicit check fires).
    cver = committed.get("methodology_version")
    rver = reproduced.get("methodology_version")
    if cver != rver:
        print(
            f"FAIL {data_date}: methodology_version mismatch (committed={cver}, current={rver}). "
            "Per L4 migration rule (docs/methodology.md): methodology/schema changes (6J-class) "
            "MUST regenerate golden + snapshot together in same commit."
        )
        return False

    cstripped = _strip_volatile(committed)
    rstripped = _strip_volatile(reproduced)
    if _docs_equiv(cstripped, rstripped):
        print(f"PASS {data_date}")
        return True

    a = json.dumps(cstripped, indent=2, sort_keys=True).splitlines()
    b = json.dumps(rstripped, indent=2, sort_keys=True).splitlines()
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
    return sorted(
        p.stem for p in config.OUTPUT_HISTORY_DIR.glob("*.json")
        if re.fullmatch(r"\d{4}-\d{2}-\d{2}", p.stem)
    )


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
