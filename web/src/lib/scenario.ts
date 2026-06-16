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
 *
 * P6 (regime): adds pure regime multiplier math for dynamic batch/prompt-length
 * scenarios. Values are the R-* bands from data/assumptions/regime_factors.yaml
 * (sourced; see ASSUMPTIONS.md). Web is static, so mirrored here (no fs read).
 * getRegimeMultiplier + apply preserve {low,mid,high} and monotonicity.
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

// --- P6 regime / batch / prompt-length math (pure, sourced R-*) ---

// Regime multiplier bands (exact copy from data/assumptions/regime_factors.yaml R-* entries;
// reference medium+high ~1.05 mid for continuity with prior "typical" assumption).
// short/med/long prompt × high/low batch. Monotonic: longer or lower-batch => higher energy.
const REGIME_FACTORS: Record<string, Range> = {
  short_high: { low: 0.75, mid: 0.95, high: 1.20 },
  short_low: { low: 1.10, mid: 1.35, high: 1.70 },
  medium_high: { low: 0.90, mid: 1.05, high: 1.30 },
  medium_low: { low: 1.35, mid: 1.65, high: 2.10 },
  long_high: { low: 1.55, mid: 2.10, high: 2.90 },
  long_low: { low: 2.60, mid: 4.00, high: 6.50 },
};

export type PromptClass = 'short' | 'medium' | 'long';
export type BatchClass = 'high' | 'low';

/** Map 0-100 slider to prompt class (short <33, med <66, long). */
export function promptClassFromValue(v: number): PromptClass {
  if (Number.isNaN(v)) return 'medium';
  if (v < 33) return 'short';
  if (v < 66) return 'medium';
  return 'long';
}

/** Map 0-100 batch slider (0=low batch/inefficient, 100=high batch/efficient). */
export function batchClassFromValue(v: number): BatchClass {
  if (Number.isNaN(v)) return 'high';
  return v < 50 ? 'low' : 'high';
}

/** Pure lookup of regime multiplier Range for classes. Always returns valid Range. */
export function getRegimeMultiplier(prompt: PromptClass, batch: BatchClass): Range {
  const key = `${prompt}_${batch}` as keyof typeof REGIME_FACTORS;
  const r = REGIME_FACTORS[key];
  if (r) return { low: r.low, mid: r.mid, high: r.high };
  // safety (no silent 0): reference 1.0
  return { low: 1.0, mid: 1.0, high: 1.0 };
}

/** Pure: regime multiplier from two 0-100 sliders (promptLen, batchEff). */
export function getRegimeMultiplierFromSliders(promptSlider: number, batchSlider: number): Range {
  const p = promptClassFromValue(promptSlider);
  const b = batchClassFromValue(batchSlider);
  return getRegimeMultiplier(p, b);
}

/** Apply regime multiplier (conservative endpoint-wise Range*Range) to a base Range (co2 or energy proxy). */
export function applyRegimeToRange(base: Range, mult: Range): Range {
  return {
    low: base.low * mult.low,
    mid: base.mid * mult.mid,
    high: base.high * mult.high,
  };
}
