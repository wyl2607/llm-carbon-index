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


def test_em_live_path_hits_v4_base_url(monkeypatch):
    """When EM key is present for a non-us-east region, call the v4 host."""
    import pipeline.grid as gmod
    from pipeline.config import ELECTRICITYMAPS_BASE_URL
    from pipeline.grid import carbon_intensity

    calls: list[dict] = []

    class FakeResp:
        ok = True

        def json(self):
            return {"carbonIntensity": 211.0}

    def fake_get(url, headers=None, timeout=None):
        calls.append({"url": url, "headers": headers, "timeout": timeout})
        return FakeResp()

    monkeypatch.setattr(gmod, "eia_api_key", lambda: None)
    monkeypatch.setattr(gmod, "electricitymaps_api_key", lambda: "em-test-key")
    monkeypatch.setattr(gmod.requests, "get", fake_get)
    monkeypatch.setattr(
        gmod,
        "_load_annual",
        lambda: [
            {
                "region": "europe-west",
                "gco2_per_kwh": 230,
                "electricitymaps_zone": "IE",
                "source_id": "C-GRID-EU",
            }
        ],
    )

    gco2, src, sid = carbon_intensity("europe-west")
    assert gco2 == 211.0
    assert src == "electricity_maps_live"
    assert sid == "GRID-EM-LIVE"
    assert calls and calls[0]["url"].startswith(ELECTRICITYMAPS_BASE_URL)
    assert "/carbon-intensity/latest?zone=IE" in calls[0]["url"]
    assert calls[0]["headers"]["auth-token"] == "em-test-key"


# --- EIA tests (mocked; real key exercised only in CI/cron with secret) ---

def test_eia_path_used_when_key_and_us_east(monkeypatch):
    import pipeline.grid as gmod
    from pipeline.grid import carbon_intensity

    def fake_fetch(key):
        assert key == "fake-eia"
        return 412.3

    monkeypatch.setattr(gmod, "_fetch_eia_pjm_intensity", fake_fetch)
    monkeypatch.setattr(gmod, "eia_api_key", lambda: "fake-eia")

    gco2, src, sid = carbon_intensity("us-east")
    assert gco2 == 412.3
    assert src == "eia_live"
    assert sid == "GRID-EIA-PJM-HOURLY"


def test_eia_falls_back_on_fetch_failure(monkeypatch):
    import pipeline.grid as gmod
    from pipeline.grid import carbon_intensity

    monkeypatch.setattr(gmod, "_fetch_eia_pjm_intensity", lambda k: None)
    monkeypatch.setattr(gmod, "eia_api_key", lambda: "fake-eia")

    gco2, src, sid = carbon_intensity("us-east")
    assert gco2 > 0
    assert src == "annual_factor"
    assert sid  # from annual table


def test_non_us_east_ignores_eia_key(monkeypatch):
    import pipeline.grid as gmod
    from pipeline.grid import carbon_intensity

    calls = []
    def fake_fetch(key):
        calls.append(key)
        return 1.0

    monkeypatch.setattr(gmod, "_fetch_eia_pjm_intensity", fake_fetch)
    monkeypatch.setattr(gmod, "eia_api_key", lambda: "fake-eia")

    gco2, src, sid = carbon_intensity("cn-north")
    assert src == "annual_factor"
    assert len(calls) == 0  # EIA never called for non us-east
