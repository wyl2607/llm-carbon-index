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
