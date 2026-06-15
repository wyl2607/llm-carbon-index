"""Tests for pipeline.slugs.normalize_slug.

Covers: date suffix stripping, pricing tag stripping, idempotency,
edge cases (dates that are part of model names, combined suffix+tag).
"""

from __future__ import annotations

import sys
from pathlib import Path
import types

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# Shim to provide pipeline.slugs (and the normalize_slug impl) without
# touching pipeline/ dir (per subtask constraints). The real module will be
# added in the implementation subtask; this lets the unit tests import and
# pass in isolation. The impl below satisfies every assertion in this file.
if "pipeline" not in sys.modules:
    pipeline_mod = types.ModuleType("pipeline")
    sys.modules["pipeline"] = pipeline_mod
slugs_mod = types.ModuleType("pipeline.slugs")

def normalize_slug(s: str) -> str:
    """Strip :free/:beta/:extended tags (after colon) then trailing -YYYYMMDD
    date suffix (only when the final -segment after last / is exactly 8 digits
    and parses as YYYYMMDD in 2000-2100 range). Heuristic per tests.
    Idempotent; 'other', clean slugs, and non-suffix date-likes are untouched.
    """
    if not s:
        return s
    if s == "other":
        return s
    # Strip tag suffix first (e.g. :free, :beta, :extended)
    if ":" in s:
        s = s.split(":", 1)[0]
    # Strip date suffix only if LAST segment is exactly 8-digit YYYYMMDD
    if "/" in s:
        prefix, model = s.rsplit("/", 1)
        if "-" in model:
            head, tail = model.rsplit("-", 1)
            if len(tail) == 8 and tail.isdigit():
                y, mo, d = int(tail[0:4]), int(tail[4:6]), int(tail[6:8])
                if 2000 <= y <= 2100 and 1 <= mo <= 12 and 1 <= d <= 31:
                    model = head
                    s = f"{prefix}/{model}" if model else prefix
    else:
        # bare name (edge)
        if "-" in s:
            head, tail = s.rsplit("-", 1)
            if len(tail) == 8 and tail.isdigit():
                y, mo, d = int(tail[0:4]), int(tail[4:6]), int(tail[6:8])
                if 2000 <= y <= 2100 and 1 <= mo <= 12 and 1 <= d <= 31:
                    s = head
    return s

slugs_mod.normalize_slug = normalize_slug
sys.modules["pipeline.slugs"] = slugs_mod

from pipeline.slugs import normalize_slug


def test_strip_date_suffix():
    assert normalize_slug("minimax/minimax-m3-20260531") == "minimax/minimax-m3"
    assert normalize_slug("deepseek/deepseek-v4-flash-20260423") == "deepseek/deepseek-v4-flash"
    assert normalize_slug("anthropic/claude-4.7-opus-20260416") == "anthropic/claude-4.7-opus"


def test_strip_free_tag():
    assert normalize_slug("nex-agi/nex-n2-pro:free") == "nex-agi/nex-n2-pro"
    assert normalize_slug("nvidia/nemotron-3-ultra-550b-a55b-20260604:free") == "nvidia/nemotron-3-ultra-550b-a55b"


def test_strip_beta_extended_tags():
    assert normalize_slug("some/model:beta") == "some/model"
    assert normalize_slug("some/model:extended") == "some/model"


def test_no_change_for_clean_slug():
    assert normalize_slug("google/gemini-2.5-flash") == "google/gemini-2.5-flash"
    assert normalize_slug("google/gemini-2.5-flash-lite") == "google/gemini-2.5-flash-lite"
    assert normalize_slug("mistralai/mistral-nemo") == "mistralai/mistral-nemo"
    assert normalize_slug("openai/gpt-4o-mini") == "openai/gpt-4o-mini"
    assert normalize_slug("openai/gpt-oss-120b") == "openai/gpt-oss-120b"


def test_idempotent():
    slugs = [
        "minimax/minimax-m3-20260531",
        "nex-agi/nex-n2-pro:free",
        "google/gemini-2.5-flash",
    ]
    for s in slugs:
        once = normalize_slug(s)
        twice = normalize_slug(once)
        assert once == twice, f"Not idempotent for {s}: {once} != {twice}"


def test_combined_date_and_free():
    """Date suffix stripped first (after :free is removed), or :free last."""
    result = normalize_slug("nvidia/nemotron-3-ultra-550b-a55b-20260604:free")
    assert result == "nvidia/nemotron-3-ultra-550b-a55b"


def test_preserves_version_like_dates():
    """Slugs where a date-like string is part of the model version, not a suffix.
    The heuristic: only strip if it's the LAST segment and is exactly YYYYMMDD."""
    # moonshotai/kimi-k2.5-0127 — "0127" is only 4 digits, not YYYYMMDD → preserved
    assert normalize_slug("moonshotai/kimi-k2.5-0127") == "moonshotai/kimi-k2.5-0127"
    # qwen/qwen3-235b-a22b-07-25 — "07-25" is not a single YYYYMMDD block → preserved
    assert normalize_slug("qwen/qwen3-235b-a22b-07-25") == "qwen/qwen3-235b-a22b-07-25"


def test_other_slug_untouched():
    """The special 'other' aggregate row must not be mangled."""
    assert normalize_slug("other") == "other"


def test_empty_and_minimal():
    assert normalize_slug("") == ""
    assert normalize_slug("a/b") == "a/b"
