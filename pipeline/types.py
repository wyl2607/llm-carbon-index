"""Cross-phase data contracts — FROZEN (docs/DATA_SCHEMAS.md is the source of truth).

These TypedDicts are the integration boundary between phases built in parallel:
- Phase 1 (ingestion) PRODUCES `NormalizedRecord`.
- Phase 2 (estimation) CONSUMES `NormalizedRecord`, PRODUCES `ModelEstimate`.
- Phase 3 (output) CONSUMES `ModelEstimate`, wraps it into `latest.json`.

Use these field names verbatim. A bare point number for energy/CO2 is a bug:
every such quantity is a `RangeDict` with low <= mid <= high.
"""

from __future__ import annotations

from typing import Literal, TypedDict

Origin = Literal["CN", "US", "EU", "OTHER"]
OpenOrClosed = Literal["open", "closed"]
EnergySource = Literal["ai_energy_score", "ecologits", "parameter_class_fallback"]
GridSource = Literal["electricity_maps_live", "annual_factor"]
# flags vocabulary (DATA_SCHEMAS §Conventions). ILLUSTRATIVE_SAMPLE is dev-only.
Flag = Literal[
    "UNKNOWN_MODEL",
    "UNMAPPED_SLUG",
    "FALLBACK_ENERGY_CLASS",
    "FALLBACK_GRID_ANNUAL",
    "CLOSED_MODEL_ASSUMED",
]


class RangeDict(TypedDict):
    """JSON form of a Range. Phase 2's `pipeline.ranges.Range` serializes to this."""

    low: float
    mid: float
    high: float


class NormalizedRecord(TypedDict):
    """Phase 1 output: one record per (date, model_slug). No energy/CO2 here.

    The OpenRouter reserved `other` aggregate row is kept with is_other=True
    (it is the denominator for totals.modeled_traffic_fraction).
    """

    date: str
    model_slug: str
    total_tokens: int
    is_other: bool


class ModelEstimate(TypedDict):
    """Phase 2 output: the per-model object of DATA_SCHEMAS §1 `models[]`."""

    slug: str
    display_name: str
    origin: Origin
    open_or_closed: OpenOrClosed
    total_tokens: int
    est_output_tokens: int
    wh_per_output_token: RangeDict
    energy_kwh: RangeDict
    energy_source: EnergySource
    energy_source_id: str
    region: str
    carbon_intensity_gco2_kwh: float
    grid_source: GridSource
    grid_source_id: str
    pue: float
    co2_kg: RangeDict
    co2_kg_embodied: RangeDict
    co2_kg_total: RangeDict
    renewable_match_pct: float | None
    co2_kg_market: RangeDict
    wue: float
    water_liters: RangeDict
    flags: list[str]


class UnmappedSlugEntry(TypedDict):
    """A top-list slug absent from the crosswalk — the Phase 6E maintenance to-do."""

    slug: str
    total_tokens: int


class Source(TypedDict):
    """Phase 6G: compact provenance entry emitted in latest.json `sources[]`.

    The full registry (with locator/license/claim) lives in
    data/provenance/sources.yaml; this is the self-describing subset.
    """

    id: str
    title: str
    publisher: str
    url: str
    version: str
    accessed: str


class Totals(TypedDict):
    """Phase 3 output: aggregate statistics over all models."""

    total_tokens: int
    uncovered_tokens: int
    modeled_traffic_fraction: float
    # Phase 6E coverage / scope honesty:
    mapped_traffic_fraction: float            # (total - uncovered - unmapped) / total
    unmapped_tokens: int                      # tokens on top-list slugs absent from crosswalk
    unmapped_traffic_fraction: float          # unmapped_tokens / total
    unmapped_slugs: list[UnmappedSlugEntry]   # the maintenance to-do, sorted desc by tokens
    est_output_tokens: int
    energy_kwh: RangeDict
    co2_kg: RangeDict
    co2_kg_embodied: RangeDict
    co2_kg_total: RangeDict
    co2_kg_market: RangeDict
    water_liters: RangeDict
    # Phase 6I: fairness companion (rank stability under alts + unweighted aggregate).
    # Always emitted by build_output; may be absent from certain hand-crafted test fixtures.
    fairness: dict
