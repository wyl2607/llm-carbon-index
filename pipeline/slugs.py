"""Slug normalization for crosswalk / intensity lookup.

OpenRouter model_permaslug values carry date suffixes (e.g.
vendor/model-name-20260531) and pricing tags (:free, :beta, :extended).
Crosswalk + intensity YAML are keyed by base slug. This module bridges them.
"""

from __future__ import annotations

import re


def normalize_slug(raw: str) -> str:
    """Normalize an OpenRouter model_permaslug for crosswalk/intensity lookup.

    1. Strip pricing tag suffix (:free, :beta, :extended)
    2. Strip trailing date suffix (-YYYYMMDD where YYYY >= 2020)

    Idempotent: already-clean slugs pass through unchanged.
    The raw slug is preserved in output artifacts — this is lookup-only.
    """
    # Step 1: strip known pricing tags
    s = re.sub(r":(free|beta|extended)$", "", raw)
    # Step 2: strip trailing -YYYYMMDD (8-digit date, year >= 2020)
    s = re.sub(r"-(\d{4})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])$", "", s)
    return s
