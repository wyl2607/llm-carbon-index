"""OpenRouter rankings-daily client (Phase 1 ingestion).

Fetches (or serves from cache) the daily top-50 + other aggregate token usage.
Respects documented limits (30/min, 500/day). Typed errors for callers.
Cache is per requested date key to keep re-runs offline and quota-safe.

Raw response shape (from OpenRouter /datasets/rankings-daily):
  {
    "data": [
      {"date": "YYYY-MM-DD", "model_permaslug": "foo/bar", "total_tokens": "123..."},
      ...
      {"date": "...", "model_permaslug": "other", "total_tokens": "..."}
    ],
    "meta": {...}
  }

normalize() maps to the frozen NormalizedRecord contract (model_permaslug -> model_slug,
total_tokens coerced from decimal string, is_other flag for the aggregate row).
"""

from __future__ import annotations

import json
import time
from collections.abc import Callable
from typing import Any, Literal

import requests

import pipeline.config as config
from pipeline.types import NormalizedRecord


class AuthError(Exception):
    """Authentication failure (missing key or 401 from API)."""


class RateLimitError(Exception):
    """Rate limit exceeded (429). Includes backoff handling before raising."""


class NetworkError(Exception):
    """Other transport or HTTP >=400 errors (non-auth, non-429)."""


def fetch_rankings_daily(
    date: str | Literal["latest"],
    *,
    _requests_get: Callable[[str], Any] | None = None,
) -> dict:
    """GET rankings-daily (optionally pinned to a single day).

    - If date == "latest": call with no date params (server default window, typically
      last ~30 days ending on most recent complete UTC day). Cache file written as
      "latest.json".
    - If date is YYYY-MM-DD: pass start_date=end_date to fetch exactly that day.
      Cache file: "{date}.json".

    Cache is checked *before* any network or key read: if present, return it
    immediately (supports offline tests and avoids quota burn on repeated runs).

    On cache miss:
      - Requires OPENROUTER_API_KEY (from config; never hardcoded).
      - Uses Bearer auth.
      - Simple backoff on 429 (respects Retry-After when present).
      - Raises AuthError on 401/missing key, RateLimitError on persistent 429,
        NetworkError on other failures.

    The injected _requests_get is for test seam (never used in prod path).
    """
    if date == "latest":
        cache_name = "latest"
        params: dict[str, str] = {}
    else:
        cache_name = date
        params = {"start_date": date, "end_date": date}

    raw_dir = config.OPENROUTER_RAW_DIR
    cache_path = raw_dir / f"{cache_name}.json"
    if cache_path.exists():
        with open(cache_path, "r", encoding="utf-8") as f:
            return json.load(f)

    # Cache miss: must fetch. Key required only for live path.
    key = config.openrouter_api_key()
    if not key:
        raise AuthError("OPENROUTER_API_KEY is required for live fetch (cache miss)")

    raw_dir.mkdir(parents=True, exist_ok=True)

    url = f"{config.OPENROUTER_BASE_URL}{config.OPENROUTER_RANKINGS_PATH}"
    headers = {"Authorization": f"Bearer {key}"}

    getter = _requests_get or requests.get

    max_attempts = 5
    last_exc: Exception | None = None
    for attempt in range(max_attempts):
        try:
            resp = getter(url, headers=headers, params=params or None, timeout=30)
        except requests.RequestException as exc:
            last_exc = exc
            if attempt == max_attempts - 1:
                raise NetworkError(f"Network error fetching rankings-daily: {exc}") from exc
            time.sleep(1.0 * (attempt + 1))
            continue

        status = resp.status_code
        if status == 401:
            raise AuthError(f"OpenRouter auth failed (401): {resp.text[:200]}")
        if status == 429:
            if attempt == max_attempts - 1:
                raise RateLimitError(
                    f"OpenRouter rate limit exceeded after {max_attempts} attempts "
                    f"(30/min, 500/day limits). Response: {resp.text[:200]}"
                )
            # Backoff: prefer Retry-After, else exponential capped
            retry_after = resp.headers.get("Retry-After")
            if retry_after:
                try:
                    sleep_s = int(retry_after)
                except ValueError:
                    sleep_s = 2 ** (attempt + 1)
            else:
                sleep_s = min(2 ** (attempt + 1), 30)
            time.sleep(sleep_s)
            continue

        if status >= 400:
            raise NetworkError(f"OpenRouter HTTP {status}: {resp.text[:200]}")

        if status == 200:
            raw: dict = resp.json()
            with open(cache_path, "w", encoding="utf-8") as f:
                json.dump(raw, f, ensure_ascii=False, indent=2)
            return raw

        # unexpected 2xx etc.
        last_exc = NetworkError(f"Unexpected status {status}")
        break

    raise NetworkError(f"Failed to fetch rankings-daily: {last_exc}")


def normalize(raw: dict) -> list[NormalizedRecord]:
    """Pure transform of raw rankings-daily payload to NormalizedRecord list.

    - Uses "model_permaslug" -> "model_slug"
    - total_tokens is provided as decimal string in raw; coerce to int here.
    - The reserved "other" row is preserved (never dropped) with is_other=True.
    - All other rows have is_other=False.
    - Order of output list follows input order (stable, server sorts with other last per date).
    """
    out: list[NormalizedRecord] = []
    for item in raw.get("data", []):
        date = item["date"]
        slug = item["model_permaslug"]
        # total_tokens arrives as string to preserve precision for very large aggregates
        tok = int(item["total_tokens"])
        is_other = slug == "other"
        rec: NormalizedRecord = {
            "date": date,
            "model_slug": slug,
            "total_tokens": tok,
            "is_other": is_other,
        }
        out.append(rec)
    return out
