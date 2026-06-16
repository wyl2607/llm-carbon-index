import type { Range } from '../types';

/**
 * Phase 6A green-electricity scenario math (pure, unit-tested).
 *
 * Extracted verbatim from the inline App.tsx simulation so this CO₂-chain
 * transform is covered by tests, per CLAUDE.md ("Tests required for every
 * function in the CO₂ chain"). Behaviour is identical to the prior inline code.
 *
 * A green-electricity shift linearly interpolates each model's grid carbon
 * intensity between its real location-based intensity and a low-carbon target
 * grid, weighted by greenShiftPercent:
 *
 *   co2_kg  = energy_kwh × PUE × intensity / 1000        // g → kg
 *   blended = orig × (1 − r) + green × r,   r = shiftPercent / 100
 *
 * At 100% the grid is modelled at GREEN_TARGET_INTENSITY — a low-carbon floor,
 * NOT zero, because a real green grid still has residual emissions. The
 * {low,mid,high} range is preserved (same positive transform on each endpoint).
 */

// Low-carbon "green grid" target intensity (gCO₂eq/kWh) the shift moves toward.
// NOTE: matches the prior inline constant; still needs a sourced entry in
// docs/ASSUMPTIONS.md (e.g. a nuclear/hydro/wind-dominated zone ≈ 50).
export const GREEN_TARGET_INTENSITY_GCO2_KWH = 50;

/** Clamp a green-shift percentage into the meaningful [0, 100] band. */
export function clampShiftPercent(pct: number): number {
  if (Number.isNaN(pct)) return 0;
  return Math.max(0, Math.min(100, pct));
}

/** CO₂ (kg) for one energy level under a green-electricity shift. */
export function shiftedCo2Kg(
  energyKwh: number,
  pue: number,
  gridIntensityGco2Kwh: number,
  greenShiftPercent: number,
  targetIntensityGco2Kwh: number = GREEN_TARGET_INTENSITY_GCO2_KWH,
): number {
  const r = clampShiftPercent(greenShiftPercent) / 100;
  const orig = (energyKwh * pue * gridIntensityGco2Kwh) / 1000;
  const green = (energyKwh * pue * targetIntensityGco2Kwh) / 1000;
  return orig * (1 - r) + green * r;
}

/** Apply the shift across a {low,mid,high} energy range → CO₂ kg range. */
export function shiftedCo2Range(
  energyKwh: Range,
  pue: number,
  gridIntensityGco2Kwh: number,
  greenShiftPercent: number,
): Range {
  return {
    low: shiftedCo2Kg(energyKwh.low, pue, gridIntensityGco2Kwh, greenShiftPercent),
    mid: shiftedCo2Kg(energyKwh.mid, pue, gridIntensityGco2Kwh, greenShiftPercent),
    high: shiftedCo2Kg(energyKwh.high, pue, gridIntensityGco2Kwh, greenShiftPercent),
  };
}
