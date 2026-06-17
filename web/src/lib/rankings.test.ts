import { describe, it, expect } from 'vitest';
import { efficiencyRange, byEfficiency, byTotalCo2, greenGrade } from './rankings';
import type { Model } from '../types';

// Minimal model factory — only the fields the ranking helpers read.
function mk(slug: string, co2Mid: number, outTokens: number, extra: Partial<Model> = {}): Model {
  return {
    slug,
    display_name: slug,
    origin: 'US',
    open_or_closed: 'open',
    total_tokens: outTokens * 5,
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
    ...extra,
  };
}

describe('efficiencyRange', () => {
  it('returns g CO₂ / 1k output tokens with ranges preserved and ordered', () => {
    // 1 kg over 1,000,000 output tokens = 1 g / 1k tokens (mid).
    const r = efficiencyRange(mk('a', 1, 1_000_000));
    expect(r.mid).toBeCloseTo(1, 6);
    expect(r.low).toBeCloseTo(0.5, 6);
    expect(r.high).toBeCloseTo(2, 6);
    expect(r.low).toBeLessThanOrEqual(r.mid);
    expect(r.mid).toBeLessThanOrEqual(r.high);
  });

  it('guards divide-by-zero output tokens (no NaN/Infinity)', () => {
    expect(efficiencyRange(mk('z', 1, 0))).toEqual({ low: 0, mid: 0, high: 0 });
  });
});

describe('byEfficiency', () => {
  it('orders greenest (lowest g/1k) first and does not mutate input', () => {
    const dirty = mk('dirty', 10, 1_000_000); // 10 g/1k
    const clean = mk('clean', 1, 1_000_000); // 1 g/1k
    const input = [dirty, clean];
    const out = byEfficiency(input);
    expect(out.map(m => m.slug)).toEqual(['clean', 'dirty']);
    expect(input.map(m => m.slug)).toEqual(['dirty', 'clean']); // unmutated
  });
});

describe('byTotalCo2', () => {
  it('defaults to biggest emitters first; asc reverses', () => {
    const small = mk('small', 2, 1_000_000);
    const big = mk('big', 9, 1_000_000);
    expect(byTotalCo2([small, big]).map(m => m.slug)).toEqual(['big', 'small']);
    expect(byTotalCo2([small, big], 'asc').map(m => m.slug)).toEqual(['small', 'big']);
  });
});

describe('greenGrade', () => {
  it('bands efficiency A→E on the documented cuts', () => {
    expect(greenGrade(0.2)).toBe('A');
    expect(greenGrade(0.5)).toBe('B'); // boundary is inclusive lower
    expect(greenGrade(1.4)).toBe('B');
    expect(greenGrade(2.9)).toBe('C');
    expect(greenGrade(4.9)).toBe('D');
    expect(greenGrade(6)).toBe('E');
  });
});
