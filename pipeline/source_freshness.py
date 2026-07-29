"""Static-source age gate for manually pinned YAML snapshots.

Live pipeline freshness is covered by data-freshness.yml (data_date on latest.json).
This module covers the other silent-staleness class: hard-coded capability / energy
scores whose ``accessed`` dates drift while CI stays green.

Policy (days since ``accessed``):
  - Q-AAII-V41 (Artificial Analysis Intelligence Index): 45d — drifts often
  - AI Energy Score entries (title contains "AI Energy Score"): 90d

Does not mutate data. Callers open an issue / fail a scheduled job when stale.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Iterable

import yaml

from pipeline.config import CAPABILITY_PATH, PROVENANCE_SOURCES_PATH, REPO_ROOT

# source_id -> max age days
VOLATILE_SOURCE_MAX_AGE_DAYS: dict[str, int] = {
    "Q-AAII-V41": 45,
}

# Any registry entry whose title matches is treated as AI Energy Score snapshot.
AI_ENERGY_TITLE_SUBSTRING = "AI Energy Score"
AI_ENERGY_MAX_AGE_DAYS = 90


@dataclass(frozen=True)
class StaleSource:
    source_id: str
    accessed: str
    age_days: int
    max_age_days: int
    location: str


def _parse_accessed(raw: object) -> date | None:
    if not isinstance(raw, str) or not raw.strip():
        return None
    try:
        return datetime.strptime(raw.strip()[:10], "%Y-%m-%d").date()
    except ValueError:
        return None


def _age_days(accessed: date, today: date) -> int:
    return (today - accessed).days


def check_registry_ages(
    sources: Iterable[dict],
    *,
    today: date | None = None,
) -> list[StaleSource]:
    """Return stale registry entries under the static-source policy."""
    today = today or date.today()
    stale: list[StaleSource] = []
    for entry in sources:
        if not isinstance(entry, dict):
            continue
        sid = entry.get("id")
        if not isinstance(sid, str) or not sid:
            continue
        max_age: int | None = VOLATILE_SOURCE_MAX_AGE_DAYS.get(sid)
        title = str(entry.get("title") or "")
        if max_age is None and AI_ENERGY_TITLE_SUBSTRING in title:
            max_age = AI_ENERGY_MAX_AGE_DAYS
        if max_age is None:
            continue
        accessed_raw = entry.get("accessed")
        accessed = _parse_accessed(accessed_raw)
        if accessed is None:
            stale.append(
                StaleSource(
                    source_id=sid,
                    accessed=str(accessed_raw or ""),
                    age_days=-1,
                    max_age_days=max_age,
                    location="data/provenance/sources.yaml",
                )
            )
            continue
        age = _age_days(accessed, today)
        if age > max_age:
            stale.append(
                StaleSource(
                    source_id=sid,
                    accessed=accessed.isoformat(),
                    age_days=age,
                    max_age_days=max_age,
                    location="data/provenance/sources.yaml",
                )
            )
    return stale


def _rel(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(REPO_ROOT.resolve()))
    except ValueError:
        return str(path)


def check_capability_yaml_ages(
    path: Path = CAPABILITY_PATH,
    *,
    today: date | None = None,
) -> list[StaleSource]:
    """Check model_capability.yaml pinned snapshot accessed dates."""
    today = today or date.today()
    try:
        with open(path, encoding="utf-8") as f:
            doc = yaml.safe_load(f)
    except Exception:
        return [
            StaleSource(
                source_id="?",
                accessed="",
                age_days=-1,
                max_age_days=VOLATILE_SOURCE_MAX_AGE_DAYS.get("Q-AAII-V41", 45),
                location=_rel(path),
            )
        ]
    if not isinstance(doc, dict):
        return []
    stale: list[StaleSource] = []
    for entry in doc.get("sources") or []:
        if not isinstance(entry, dict):
            continue
        sid = str(entry.get("id") or "capability")
        max_age = VOLATILE_SOURCE_MAX_AGE_DAYS.get(sid, 45)
        accessed = _parse_accessed(entry.get("accessed"))
        if accessed is None:
            stale.append(
                StaleSource(
                    source_id=sid,
                    accessed=str(entry.get("accessed") or ""),
                    age_days=-1,
                    max_age_days=max_age,
                    location=_rel(path),
                )
            )
            continue
        age = _age_days(accessed, today)
        if age > max_age:
            stale.append(
                StaleSource(
                    source_id=sid,
                    accessed=accessed.isoformat(),
                    age_days=age,
                    max_age_days=max_age,
                    location=_rel(path),
                )
            )
    return stale


def find_stale_static_sources(*, today: date | None = None) -> list[StaleSource]:
    """Scan registry + capability YAML for stale accessed dates."""
    today = today or date.today()
    try:
        with open(PROVENANCE_SOURCES_PATH, encoding="utf-8") as f:
            registry = yaml.safe_load(f) or []
    except Exception:
        registry = []
    if not isinstance(registry, list):
        registry = []
    return check_registry_ages(registry, today=today) + check_capability_yaml_ages(today=today)


def main() -> int:
    stale = find_stale_static_sources()
    if not stale:
        print("static source ages: OK")
        return 0
    print("static source ages: STALE")
    for item in stale:
        print(
            f"  - {item.source_id} accessed={item.accessed} "
            f"age={item.age_days}d max={item.max_age_days}d @ {item.location}"
        )
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
