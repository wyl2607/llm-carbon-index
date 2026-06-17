import { describe, it, expect } from 'vitest';
import { aggregateByRegion, bestRegionScenario } from './regions';
import type { Model } from '../types';

function mk(slug: string, region: string, ci: number, energyMid: number, ren?: number): Model {
  return {
    slug,
    display_name: slug,
    origin: 'US',
    open_or_closed: 'open',
    total_tokens: 1000,
    est_output_tokens: 200,
    wh_per_output_token: { low: 0, mid: 0, high: 0 },
    energy_kwh: { low: energyMid * 0.5, mid: energyMid, high: energyMid * 2 },
    energy_source: 'ecologits',
    region,
    carbon_intensity_gco2_kwh: ci,
    grid_source: 'annual_factor',
    pue: 1.0,
    // co2 consistent with energy×pue×ci/1000 at mid for the scenario math test.
    co2_kg: { low: (energyMid * 0.5 * ci) / 1000, mid: (energyMid * ci) / 1000, high: (energyMid * 2 * ci) / 1000 },
    renewable_match_pct: ren ?? null,
    flags: [],
  };
}

describe('aggregateByRegion', () => {
  it('sums ranges, energy-weights intensity, sorts cleanest first', () => {
    const models = [
      mk('a', 'dirty', 600, 100),
      mk('b', 'dirty', 600, 300),
      mk('c', 'clean', 50, 200),
    ];
    const aggs = aggregateByRegion(models);
    expect(aggs.map(a => a.region)).toEqual(['clean', 'dirty']); // 50 < 600
    const dirty = aggs.find(a => a.region === 'dirty')!;
    expect(dirty.modelCount).toBe(2);
    expect(dirty.totalEnergyKwh.mid).toBe(400);
    expect(dirty.carbonIntensity).toBeCloseTo(600, 6); // both share 600
  });

  it('returns undefined renewablePct when no model reports it', () => {
    const aggs = aggregateByRegion([mk('a', 'r', 400, 100)]);
    expect(aggs[0].renewablePct).toBeUndefined();
  });

  it('energy-weights renewable match when present', () => {
    const aggs = aggregateByRegion([
      mk('a', 'r', 400, 100, 0),
      mk('b', 'r', 400, 300, 100),
    ]);
    // weighted: (100*0 + 300*100) / 400 = 75
    expect(aggs[0].renewablePct).toBeCloseTo(75, 6);
  });
});

describe('bestRegionScenario', () => {
  it('shifts all traffic to the cleanest grid and reports a saving', () => {
    const models = [
      mk('a', 'dirty', 600, 100),
      mk('b', 'clean', 50, 100),
    ];
    const s = bestRegionScenario(models)!;
    expect(s.cleanestRegion).toBe('clean');
    expect(s.cleanestIntensity).toBeCloseTo(50, 6);
    // current mid = (100*600 + 100*50)/1000 = 65 kg; shifted = (100*50 + 100*50)/1000 = 10 kg
    expect(s.currentTotalCo2.mid).toBeCloseTo(65, 6);
    expect(s.shiftedTotalCo2.mid).toBeCloseTo(10, 6);
    expect(s.savedFraction).toBeCloseTo((65 - 10) / 65, 6);
    expect(s.shiftedTotalCo2.low).toBeLessThanOrEqual(s.shiftedTotalCo2.mid);
  });

  it('returns null for no models', () => {
    expect(bestRegionScenario([])).toBeNull();
  });
});
