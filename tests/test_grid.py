"""Tests for pipeline.grid zone resolution + fallback.

The live Electricity Maps path requires a real EM zone code (not our internal
region key). em_zone_for_region maps the region to the zone from annual_factors;
when absent the live query is skipped so we never query an invalid zone that
would always 4xx and silently degrade.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from pipeline.grid import carbon_intensity, em_zone_for_region

ANNUAL = [
    {"region": "us-east", "gco2_per_kwh": 380, "electricitymaps_zone": "US-MIDA-PJM"},
    {"region": "europe-west", "gco2_per_kwh": 230, "electricitymaps_zone": "IE"},
    {"region": "eu-27", "gco2_per_kwh": 242},  # bloc, no single EM zone
    {"region": "default", "gco2_per_kwh": 400},
]


def test_em_zone_resolves_for_mapped_region():
    assert em_zone_for_region("us-east", ANNUAL) == "US-MIDA-PJM"
    assert em_zone_for_region("europe-west", ANNUAL) == "IE"


def test_em_zone_none_when_region_has_no_zone():
    # eu-27 has no electricitymaps_zone -> skip live (use annual)
    assert em_zone_for_region("eu-27", ANNUAL) is None


def test_em_zone_none_when_region_unknown():
    assert em_zone_for_region("mars-1", ANNUAL) is None


def test_carbon_intensity_falls_back_to_annual_without_key():
    # No EM key in the test env -> always annual fallback, labelled, never silent 0.
    gco2, src, sid = carbon_intensity("us-east")
    assert gco2 > 0
    assert src == "annual_factor"
    assert sid
