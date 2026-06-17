import type { Model, Range } from '../types';
import { co2Per1kOutputTokens } from './format';

/**
 * Ranking helpers for the "Greenest models" leaderboards (pure, unit-tested).
 *
 * Efficiency is grams CO₂ per 1 000 output tokens (co2Per1kOutputTokens in
 * format.ts). Lower = greener. We never mutate the input array.
 *
 * NOTE (tokenizer caveat, PLAN.md Hard Constraint #9): output-token counts come
 * from different tokenizers and are not perfectly comparable across providers;
 * efficiency rankings are indicative, not exact. Surfaced in the page copy.
 */

/** grams CO₂ per 1 000 output tokens, as a {low,mid,high} range (preserves uncertainty). */
export function efficiencyRange(m: Model): Range {
  const out = m.est_output_tokens;
  if (!out || out <= 0) return { low: 0, mid: 0, high: 0 };
  const g = (kg: number) => (kg / out) * 1000 * 1000; // kg→g per 1k tokens
  return { low: g(m.co2_kg.low), mid: g(m.co2_kg.mid), high: g(m.co2_kg.high) };
}

/** Models sorted greenest-first by efficiency mid (g CO₂ / 1k output tokens). */
export function byEfficiency(models: Model[]): Model[] {
  return [...models].sort((a, b) => co2Per1kOutputTokens(a) - co2Per1kOutputTokens(b));
}

/** Models sorted by total operational CO₂; descending = biggest emitters first. */
export function byTotalCo2(models: Model[], dir: 'asc' | 'desc' = 'desc'): Model[] {
  const s = [...models].sort((a, b) => a.co2_kg.mid - b.co2_kg.mid);
  return dir === 'desc' ? s.reverse() : s;
}

export type GreenGrade = 'A' | 'B' | 'C' | 'D' | 'E';

/**
 * Five-tier green grade from efficiency (g CO₂ / 1k output tokens). Display
 * banding only — NOT a model fact. Anchored on the two thresholds already used
 * in ModelsTable.tsx (isLowEmission < 0.5 g, isHighEmission > 5.0 g); the
 * intermediate cuts (1.5, 3.0) interpolate between them. Documented in
 * docs/methodology.md alongside the table thresholds.
 */
export function greenGrade(effG: number): GreenGrade {
  if (effG < 0.5) return 'A';
  if (effG < 1.5) return 'B';
  if (effG < 3.0) return 'C';
  if (effG < 5.0) return 'D';
  return 'E';
}
