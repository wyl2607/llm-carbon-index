import { describe, it, expect } from 'vitest';
import { buildRecommendations } from './recommend';
import type { Model } from '../types';

function mk(slug: string, co2Mid: number, outTokens: number, oc: 'open' | 'closed', totalTokens: number): Model {
  return {
    slug,
    display_name: slug,
    origin: 'US',
    open_or_closed: oc,
    total_tokens: totalTokens,
    est_output_tokens: outTokens,
    wh_per_output_token: { low: 0, mid: 0, high: 0 },
    energy_kwh: { low: 0, mid: 0, high: 0 },
    energy_source: 'ecologits',
    region: 'us-east',
    carbon_intensity_gco2_kwh: 400,
    grid_source: 'annual_factor',
    pue: 1.2,
    co2_kg: { low: co2Mid * 0.5, mid: co2Mid, high: co2Mid * 2 },
    flags: [],
  };
}

describe('buildRecommendations', () => {
  it('suggests the greenest same-class peer with a positive saving', () => {
    const dirtyOpen = mk('dirty-open', 10, 1_000_000, 'open', 1000);
    const cleanOpen = mk('clean-open', 1, 1_000_000, 'open', 10);
    const recs = buildRecommendations([dirtyOpen, cleanOpen]);
    const rec = recs.find(r => r.model.slug === 'dirty-open')!;
    expect(rec.alternative.slug).toBe('clean-open');
    expect(rec.savedFraction.mid).toBeCloseTo(0.9, 6); // (10-1)/10
    expect(rec.savedFraction.low).toBeLessThanOrEqual(rec.savedFraction.mid);
    expect(rec.savedFraction.high).toBeGreaterThanOrEqual(rec.savedFraction.mid);
    expect(rec.savedFraction.mid).toBeLessThanOrEqual(1);
  });

  it('never crosses the open/closed boundary', () => {
    const dirtyOpen = mk('dirty-open', 10, 1_000_000, 'open', 1000);
    const cleanClosed = mk('clean-closed', 1, 1_000_000, 'closed', 10);
    // No greener OPEN peer exists → dirty-open gets no recommendation.
    const recs = buildRecommendations([dirtyOpen, cleanClosed]);
    expect(recs.find(r => r.model.slug === 'dirty-open')).toBeUndefined();
  });

  it('does not recommend when the model is already greenest in its class', () => {
    const clean = mk('clean', 1, 1_000_000, 'open', 1000);
    const dirty = mk('dirty', 10, 1_000_000, 'open', 10);
    const recs = buildRecommendations([clean, dirty]);
    expect(recs.find(r => r.model.slug === 'clean')).toBeUndefined();
  });
});
