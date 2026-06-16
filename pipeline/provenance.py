"""Phase 6G: provenance ledger + the "no unsourced number" gate.

Pure tree-walking logic + a thin YAML loader. `unsourced_numbers` walks parsed
data trees and returns the path of any record that *owns a number* but lacks a
resolvable `source_id` / `source_ids` — the machine-checkable form of CLAUDE.md's
"no magic numbers" rule. Run as a module (`python -m pipeline.provenance`) it
scans the repo data and exits non-zero on any hit (wired into CI + DoD).
"""
from __future__ import annotations

import sys
from collections.abc import Iterable
from pathlib import Path

import yaml

from pipeline.config import PROVENANCE_GATED_PATHS, PROVENANCE_SOURCES_PATH

# No-quote guard: `claim` must be a short paraphrase, never pasted source text.
MAX_CLAIM_LEN = 200

# Compact fields surfaced in latest.json `sources[]` (DATA_SCHEMAS §1).
_COMPACT_FIELDS = ("id", "title", "publisher", "url", "version", "accessed")


def load_sources(path: Path = PROVENANCE_SOURCES_PATH) -> dict[str, dict]:
    """Load the provenance registry, keyed by `id`. Empty dict if missing/unparsable."""
    try:
        with open(path, encoding="utf-8") as f:
            loaded = yaml.safe_load(f)
    except Exception:
        return {}
    if not isinstance(loaded, list):
        return {}
    return {e["id"]: e for e in loaded if isinstance(e, dict) and e.get("id")}


def resolve(source_id: str, sources: dict[str, dict] | None = None) -> dict | None:
    """Return the source entry for `source_id`, or None if it does not resolve."""
    if sources is None:
        sources = load_sources()
    return sources.get(source_id)


def _is_number(x: object) -> bool:
    return isinstance(x, (int, float)) and not isinstance(x, bool)


def _is_numeric_leaf_group(v: object) -> bool:
    """A non-empty dict whose every value is a number (e.g. a {low,mid,high} Range).

    Such a dict is treated as a numeric *leaf* owned by its parent record, not a
    record that needs its own source_id.
    """
    return isinstance(v, dict) and len(v) > 0 and all(_is_number(x) for x in v.values())


def _owns_numbers(node: dict) -> bool:
    """True if a dict directly holds a number, a Range-like leaf, or a list of numbers."""
    for v in node.values():
        if _is_number(v):
            return True
        if _is_numeric_leaf_group(v):
            return True
        if isinstance(v, list) and v and all(_is_number(i) for i in v):
            return True
    return False


def _source_ids(node: dict) -> list[str]:
    ids: list[str] = []
    sid = node.get("source_id")
    if isinstance(sid, str):
        ids.append(sid)
    sids = node.get("source_ids")
    if isinstance(sids, list):
        ids.extend(s for s in sids if isinstance(s, str))
    return ids


def _has_resolvable_source(node: dict, valid_ids: set[str] | None) -> bool:
    ids = _source_ids(node)
    if not ids:
        return False
    if valid_ids is None:
        return True
    return any(i in valid_ids for i in ids)


def unsourced_numbers(
    data_tree: object, valid_ids: set[str] | None = None, path: str = ""
) -> list[str]:
    """Return paths of records that own a number but lack a resolvable source_id.

    `valid_ids` (the registry keys) makes "resolvable" mean present AND defined; pass
    None to only require presence. Walks nested dicts and lists; Range-like leaves
    ({low,mid,high}) are owned by their parent record, not checked on their own.
    """
    results: list[str] = []
    if isinstance(data_tree, dict):
        if _owns_numbers(data_tree) and not _has_resolvable_source(data_tree, valid_ids):
            results.append(path or "<root>")
        for k, v in data_tree.items():
            if isinstance(v, dict) and not _is_numeric_leaf_group(v):
                results.extend(unsourced_numbers(v, valid_ids, f"{path}.{k}"))
            elif isinstance(v, list):
                for i, item in enumerate(v):
                    results.extend(unsourced_numbers(item, valid_ids, f"{path}.{k}[{i}]"))
    elif isinstance(data_tree, list):
        for i, item in enumerate(data_tree):
            results.extend(unsourced_numbers(item, valid_ids, f"{path}[{i}]"))
    return results


def long_claims(sources: dict[str, dict], max_len: int = MAX_CLAIM_LEN) -> list[str]:
    """Source ids whose `claim` exceeds the paraphrase length cap (no-quote guard)."""
    return [
        sid
        for sid, e in sources.items()
        if isinstance(e.get("claim"), str) and len(e["claim"]) > max_len
    ]


def compact_sources(
    source_ids: Iterable[str], sources: dict[str, dict] | None = None
) -> list[dict]:
    """Compact registry entries for the given ids, sorted by id (for stable output)."""
    if sources is None:
        sources = load_sources()
    out: list[dict] = []
    for sid in sorted(set(source_ids)):
        e = sources.get(sid)
        if e:
            out.append({f: e.get(f) for f in _COMPACT_FIELDS})
    return out


def scan_repo(paths: Iterable[Path] = PROVENANCE_GATED_PATHS) -> list[str]:
    """Run unsourced_numbers over every gated data YAML; return `<file>: <path>` hits."""
    valid_ids = set(load_sources().keys())
    hits: list[str] = []
    for p in paths:
        try:
            with open(p, encoding="utf-8") as f:
                tree = yaml.safe_load(f)
        except Exception as exc:  # noqa: BLE001 - report unreadable data as a hit
            hits.append(f"{p.name}: <unreadable: {exc}>")
            continue
        for hit in unsourced_numbers(tree, valid_ids):
            hits.append(f"{p.name}: {hit}")
    return hits


def main() -> int:
    """CLI gate: exit 1 if any gated data number lacks a resolvable source_id."""
    hits = scan_repo()
    if hits:
        print("UNSOURCED NUMBERS (each must resolve to data/provenance/sources.yaml):")
        for h in hits:
            print(f"  - {h}")
        return 1
    print("provenance gate: all gated data numbers resolve to a source. OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
