"""Environment + path resolution (ENGINEERING_STANDARDS §1, §4).

I/O configuration only. No secrets in code: keys come from env. All data paths
resolve relative to the repo root so the pipeline is location-independent.
"""

from __future__ import annotations

import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]

# --- data layout (must match docs/DATA_SCHEMAS.md) ---
DATA_DIR = REPO_ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
OPENROUTER_RAW_DIR = RAW_DIR / "openrouter"          # data/raw/openrouter/{date}.json
NORMALIZED_PATH = RAW_DIR / "normalized.jsonl"       # appended, deduped on (date, slug)

CROSSWALK_PATH = DATA_DIR / "crosswalk" / "model_crosswalk.yaml"
INTENSITY_PATH = DATA_DIR / "energy" / "intensity.yaml"
CLOSED_MODELS_PATH = DATA_DIR / "assumptions" / "closed_models.yaml"
VENDOR_CLAIMS_PATH = DATA_DIR / "assumptions" / "vendor_claims.yaml"
METHODOLOGY_FACTORS_PATH = DATA_DIR / "assumptions" / "methodology_factors.yaml"
ANNUAL_FACTORS_PATH = DATA_DIR / "grid" / "annual_factors.yaml"
ALT_ASSUMPTION_SETS_PATH = DATA_DIR / "assumptions" / "alt_assumption_sets.yaml"
PROVENANCE_SOURCES_PATH = DATA_DIR / "provenance" / "sources.yaml"

# Data YAMLs walked by the Phase 6G "no unsourced number" gate. The provenance
# registry itself is the source of truth and is excluded from the walk.
PROVENANCE_GATED_PATHS = (
    CROSSWALK_PATH,
    INTENSITY_PATH,
    CLOSED_MODELS_PATH,
    VENDOR_CLAIMS_PATH,
    METHODOLOGY_FACTORS_PATH,
    ANNUAL_FACTORS_PATH,
    ALT_ASSUMPTION_SETS_PATH,
)

OUTPUT_DIR = DATA_DIR / "output"
OUTPUT_LATEST_PATH = OUTPUT_DIR / "latest.json"
OUTPUT_HISTORY_DIR = OUTPUT_DIR / "history"          # data/output/history/{data_date}.json
OUTPUT_TIMESERIES_PATH = OUTPUT_DIR / "timeseries.json"
MANIFEST_PATH = OUTPUT_DIR / "manifest.json"         # Phase 6H run manifest (append-only)
SENSITIVITY_PATH = OUTPUT_DIR / "sensitivity.json"   # Phase 6K OAT sensitivity report (latest)

# Phase 6H reproducibility: frozen raw inputs per run, data/raw/snapshots/{data_date}/
SNAPSHOTS_DIR = RAW_DIR / "snapshots"

SCHEMA_PATH = REPO_ROOT / "schemas" / "output.schema.json"

# --- external services ---
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
OPENROUTER_RANKINGS_PATH = "/datasets/rankings-daily"
# OpenRouter limits (CLAUDE.md / ENGINEERING_STANDARDS): 30 req/min, 500 req/day.
OPENROUTER_MAX_REQ_PER_MIN = 30
OPENROUTER_MAX_REQ_PER_DAY = 500

ELECTRICITYMAPS_BASE_URL = "https://api.electricitymap.org/v3"


def openrouter_api_key() -> str | None:
    """Read OPENROUTER_API_KEY from env. Returns None if unset (callers raise
    their own typed error so this stays I/O-policy-free)."""
    return os.environ.get("OPENROUTER_API_KEY") or None


def electricitymaps_api_key() -> str | None:
    """Read ELECTRICITYMAPS_API_KEY from env (optional; absence triggers the
    annual-factor fallback, never a crash)."""
    return os.environ.get("ELECTRICITYMAPS_API_KEY") or None
