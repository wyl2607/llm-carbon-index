import type { Model } from '../types';
import { efficiencyRange } from './rankings';

/**
 * "Pick a greener model" recommendations (pure, unit-tested).
 *
 * For a given model we suggest the most efficient alternative in the SAME class
 * (open vs closed) — the realistic swap a user can make without changing their
 * open/closed posture. Efficiency is g CO₂ / 1k output tokens (efficiencyRange).
 * Savings carry the {low,mid,high} range so we never imply false precision.
 *
 * Tokenizer caveat (PLAN.md #9): cross-provider token counts use different
 * tokenizers, so per-token comparisons are indicative. Stated in page copy.
 */

export interface Recommendation {
  model: Model;
  modelEffMid: number;
  alternative: Model;
  altEffMid: number;
  /** fraction of per-token CO₂ saved by switching, {low,mid,high} in [0,1]. */
  savedFraction: { low: number; mid: number; high: number };
}

/** Most efficient model in the same class as `m`, excluding `m` itself. */
function greenestPeer(m: Model, models: Model[]): Model | null {
  let best: Model | null = null;
  let bestEff = Infinity;
  for (const c of models) {
    if (c.slug === m.slug) continue;
    if (c.open_or_closed !== m.open_or_closed) continue;
    const eff = efficiencyRange(c).mid;
    if (eff > 0 && eff < bestEff) {
      bestEff = eff;
      best = c;
    }
  }
  return best;
}

/**
 * Build switch recommendations for the highest-traffic models. Only returns a
 * row when a strictly greener same-class alternative exists (savings mid > 0).
 */
export function buildRecommendations(models: Model[], topN = 12): Recommendation[] {
  const popular = [...models].sort((a, b) => b.total_tokens - a.total_tokens).slice(0, topN);
  const recs: Recommendation[] = [];
  for (const m of popular) {
    const alt = greenestPeer(m, models);
    if (!alt) continue;
    const me = efficiencyRange(m);
    const ae = efficiencyRange(alt);
    if (me.mid <= 0 || ae.mid >= me.mid) continue; // no real improvement
    const frac = (mEff: number, aEff: number) => (mEff > 0 ? Math.max(0, Math.min(1, (mEff - aEff) / mEff)) : 0);
    recs.push({
      model: m,
      modelEffMid: me.mid,
      alternative: alt,
      altEffMid: ae.mid,
      // low savings = pessimistic (model's low vs alt's high); high savings = optimistic.
      savedFraction: {
        low: frac(me.low, ae.high),
        mid: frac(me.mid, ae.mid),
        high: frac(me.high, ae.low),
      },
    });
  }
  return recs;
}
