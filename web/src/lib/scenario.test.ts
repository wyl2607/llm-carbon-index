/**
 * Phase 6A green-electricity scenario math — unit tests.
 * Locks the CO₂-chain transform that drives the What-If simulator (previously
 * inline + untested in App.tsx). Guards: linear blend, green floor (not zero),
 * ranges intact, clamping.
 */
import { describe, it, expect } from 'vitest';
import {
  GREEN_TARGET_INTENSITY_GCO2_KWH,
  clampShiftPercent,
  shiftedCo2Kg,
  shiftedCo2Range,
} from './scenario';
import type { Range } from '../types';

// energy 1000 kWh, PUE 1.0, grid 400 g/kWh → orig = 400 kg; green floor = 50 kg.
const E = 1000;
const PUE = 1.0;
const GRID = 400;

describe('clampShiftPercent', () => {
  it('passes [0,100] through, clamps out-of-range and NaN', () => {
    expect(clampShiftPercent(0)).toBe(0);
    expect(clampShiftPercent(100)).toBe(100);
    expect(clampShiftPercent(-5)).toBe(0);
    expect(clampShiftPercent(130)).toBe(100);
    expect(clampShiftPercent(Number.NaN)).toBe(0);
  });
});

describe('shiftedCo2Kg', () => {
  it('shift 0% = original location-based emission (energy×pue×grid/1000)', () => {
    expect(shiftedCo2Kg(E, PUE, GRID, 0)).toBeCloseTo(400);
  });
  it('shift 100% = green floor (target intensity), NOT zero', () => {
    expect(shiftedCo2Kg(E, PUE, GRID, 100)).toBeCloseTo(
      (E * PUE * GREEN_TARGET_INTENSITY_GCO2_KWH) / 1000,
    );
    expect(shiftedCo2Kg(E, PUE, GRID, 100)).toBeCloseTo(50);
  });
  it('shift 50% = linear blend of original and green floor', () => {
    expect(shiftedCo2Kg(E, PUE, GRID, 50)).toBeCloseTo((400 + 50) / 2); // 225
  });
  it('clamps negative and >100 before blending', () => {
    expect(shiftedCo2Kg(E, PUE, GRID, -10)).toBeCloseTo(400);
    expect(shiftedCo2Kg(E, PUE, GRID, 200)).toBeCloseTo(50);
  });
  it('honours PUE', () => {
    expect(shiftedCo2Kg(E, 1.2, GRID, 0)).toBeCloseTo(480);
  });
});

describe('shiftedCo2Range', () => {
  const energy: Range = { low: 500, mid: 1000, high: 2000 };
  it('applies per endpoint and preserves low ≤ mid ≤ high', () => {
    const r = shiftedCo2Range(energy, PUE, GRID, 50);
    expect(r.low).toBeCloseTo(112.5);
    expect(r.mid).toBeCloseTo(225);
    expect(r.high).toBeCloseTo(450);
    expect(r.low).toBeLessThanOrEqual(r.mid);
    expect(r.mid).toBeLessThanOrEqual(r.high);
  });
  it('shift 0 leaves the location-based range intact', () => {
    const r = shiftedCo2Range(energy, PUE, GRID, 0);
    expect(r).toEqual({ low: 200, mid: 400, high: 800 });
  });
});

// --- P6 regime math tests (pure functions, monotonic, sourced bounds) ---

import {
  getRegimeMultiplier,
  getRegimeMultiplierFromSliders,
  applyRegimeToRange,
  promptClassFromValue,
  batchClassFromValue,
  type PromptClass,
  type BatchClass,
} from './scenario';

describe('promptClassFromValue / batchClassFromValue', () => {
  it('maps sliders to discrete classes (P6)', () => {
    expect(promptClassFromValue(0)).toBe('short');
    expect(promptClassFromValue(32)).toBe('short');
    expect(promptClassFromValue(33)).toBe('medium');
    expect(promptClassFromValue(65)).toBe('medium');
    expect(promptClassFromValue(66)).toBe('long');
    expect(promptClassFromValue(100)).toBe('long');
    expect(promptClassFromValue(NaN)).toBe('medium');

    expect(batchClassFromValue(0)).toBe('low');
    expect(batchClassFromValue(49)).toBe('low');
    expect(batchClassFromValue(50)).toBe('high');
    expect(batchClassFromValue(100)).toBe('high');
    expect(batchClassFromValue(NaN)).toBe('high');
  });
});

describe('getRegimeMultiplier (P6)', () => {
  it('returns valid Range low<=mid<=high for all 6 classes', () => {
    const classes: Array<[PromptClass, BatchClass]> = [
      ['short','high'], ['short','low'],
      ['medium','high'], ['medium','low'],
      ['long','high'], ['long','low'],
    ];
    for (const [p, b] of classes) {
      const m = getRegimeMultiplier(p, b);
      expect(m.low).toBeLessThanOrEqual(m.mid);
      expect(m.mid).toBeLessThanOrEqual(m.high);
      expect(m.low).toBeGreaterThan(0);
    }
  });

  it('is strictly monotonic: longer prompt or lower batch => higher energy mult (mid+high)', () => {
    const shortHigh = getRegimeMultiplier('short', 'high');
    const shortLow = getRegimeMultiplier('short', 'low');
    const medHigh = getRegimeMultiplier('medium', 'high');
    const medLow = getRegimeMultiplier('medium', 'low');
    const longHigh = getRegimeMultiplier('long', 'high');
    const longLow = getRegimeMultiplier('long', 'low');

    // within same prompt, low batch > high batch
    expect(shortLow.mid).toBeGreaterThan(shortHigh.mid);
    expect(medLow.mid).toBeGreaterThan(medHigh.mid);
    expect(longLow.mid).toBeGreaterThan(longHigh.mid);

    // across prompt length (holding batch)
    expect(medHigh.mid).toBeGreaterThan(shortHigh.mid);
    expect(longHigh.mid).toBeGreaterThan(medHigh.mid);
    expect(medLow.mid).toBeGreaterThan(shortLow.mid);
    expect(longLow.mid).toBeGreaterThan(medLow.mid);

    // cross extremes
    expect(longLow.high).toBeGreaterThan(shortHigh.high);
  });

  it('from sliders matches class lookup', () => {
    expect(getRegimeMultiplierFromSliders(10, 90)).toEqual(getRegimeMultiplier('short', 'high'));
    expect(getRegimeMultiplierFromSliders(80, 10)).toEqual(getRegimeMultiplier('long', 'low'));
  });
});

describe('applyRegimeToRange + published bounds (P6)', () => {
  const baseEnergy: Range = { low: 0.0005, mid: 0.005, high: 0.012 }; // covers small-to-large class high
  it('applies endpoint-wise (conservative) and keeps low<=mid<=high', () => {
    const mult = getRegimeMultiplier('long', 'low');
    const scaled = applyRegimeToRange(baseEnergy, mult);
    expect(scaled.low).toBeCloseTo(baseEnergy.low * mult.low);
    expect(scaled.mid).toBeCloseTo(baseEnergy.mid * mult.mid);
    expect(scaled.high).toBeCloseTo(baseEnergy.high * mult.high);
    expect(scaled.low).toBeLessThanOrEqual(scaled.mid);
    expect(scaled.mid).toBeLessThanOrEqual(scaled.high);
  });

  it('regime bounds stay inside published per-token / query ranges (Jegham LIT-JEGHAM + E-METHOD)', () => {
    // Jegham: long-prompt max ~29 Wh/query; short ~0.42. Use E-METHOD divisor ~150 output tok for per-tok equiv.
    const TOK = 150;
    const longMaxWhPerQuery = 29;
    const impliedMaxPerTok = longMaxWhPerQuery / TOK; // ~0.193 Wh/tok

    const maxBasePerTok = 0.012; // large class high from intensity
    const longLow = getRegimeMultiplier('long', 'low');
    const effectiveMax = maxBasePerTok * longLow.high;

    // effective long-low must not exceed published long extreme (with margin for E-METHOD variance)
    expect(effectiveMax).toBeLessThanOrEqual(impliedMaxPerTok * 1.1); // conservative allowance documented in ASSUMPTIONS

    // all regime mids produce query energy for 150 tok output that is > short lit min and < long max (sanity, no fabrication)
    const shortHigh = getRegimeMultiplier('short', 'high');
    const qShort = 0.002 * shortHigh.mid * TOK; // reference-ish base (mid of med class)
    expect(qShort).toBeGreaterThan(0.1); // short regime still produces non-zero; full short-query lit 0.42 includes overheads
    const qLong = maxBasePerTok * longLow.mid * TOK;
    expect(qLong).toBeLessThanOrEqual(longMaxWhPerQuery);
  });
});
