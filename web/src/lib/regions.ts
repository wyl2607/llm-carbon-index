import type { Model, Range } from '../types';

/**
 * Region aggregation for the "Regions & grid" page (pure, unit-tested).
 *
 * Each model already carries its serving region's grid intensity
 * (carbon_intensity_gco2_kwh) and the CO₂ computed against it. We roll models up
 * per region and expose an energy-weighted average intensity so a region with
 * mostly tiny models isn't ranked as dirty as a region running heavy traffic on
 * the same grid. Ranges are summed endpoint-wise (uncertainty preserved).
 */

export interface RegionAgg {
  region: string;
  modelCount: number;
  totalEnergyKwh: Range;
  totalCo2Kg: Range;
  /** energy-weighted mean grid intensity (gCO₂/kWh). */
  carbonIntensity: number;
  /** energy-weighted renewable match %, or undefined when no model reports it. */
  renewablePct?: number;
}

const zero = (): Range => ({ low: 0, mid: 0, high: 0 });
const add = (a: Range, b: Range): Range => ({ low: a.low + b.low, mid: a.mid + b.mid, high: a.high + b.high });

/** Aggregate models by region, sorted cleanest → dirtiest by intensity. */
export function aggregateByRegion(models: Model[]): RegionAgg[] {
  const groups = new Map<string, Model[]>();
  for (const m of models) {
    const arr = groups.get(m.region) ?? [];
    arr.push(m);
    groups.set(m.region, arr);
  }

  const aggs: RegionAgg[] = [];
  for (const [region, ms] of groups) {
    let energy = zero();
    let co2 = zero();
    let weightedCi = 0;
    let renWeighted = 0;
    let renWeight = 0;
    for (const m of ms) {
      energy = add(energy, m.energy_kwh);
      co2 = add(co2, m.co2_kg);
      weightedCi += m.energy_kwh.mid * m.carbon_intensity_gco2_kwh;
      if (m.renewable_match_pct != null) {
        renWeighted += m.energy_kwh.mid * m.renewable_match_pct;
        renWeight += m.energy_kwh.mid;
      }
    }
    const carbonIntensity = energy.mid > 0 ? weightedCi / energy.mid : 0;
    aggs.push({
      region,
      modelCount: ms.length,
      totalEnergyKwh: energy,
      totalCo2Kg: co2,
      carbonIntensity,
      renewablePct: renWeight > 0 ? renWeighted / renWeight : undefined,
    });
  }
  return aggs.sort((a, b) => a.carbonIntensity - b.carbonIntensity);
}

export interface BestRegionScenario {
  cleanestRegion: string;
  cleanestIntensity: number;
  currentTotalCo2: Range;
  /** total CO₂ if ALL traffic were served on the cleanest region's grid. */
  shiftedTotalCo2: Range;
  /** fraction of current CO₂ avoided (mid), in [0,1]. */
  savedFraction: number;
}

/**
 * "What if every model ran on the cleanest available region's grid?" Recomputes
 * each model's operational CO₂ at the lowest regional intensity:
 *   co2_kg = energy_kwh × PUE × intensity / 1000   (g → kg)
 * — the same transform as estimate_carbon / scenario.shiftedCo2Kg.
 */
export function bestRegionScenario(models: Model[]): BestRegionScenario | null {
  const regions = aggregateByRegion(models);
  if (!regions.length) return null;
  const cleanest = regions[0];
  const target = cleanest.carbonIntensity;

  let current = zero();
  let shifted = zero();
  for (const m of models) {
    current = add(current, m.co2_kg);
    const at = (kwh: number) => (kwh * m.pue * target) / 1000;
    shifted = add(shifted, { low: at(m.energy_kwh.low), mid: at(m.energy_kwh.mid), high: at(m.energy_kwh.high) });
  }
  const savedFraction = current.mid > 0 ? Math.max(0, (current.mid - shifted.mid) / current.mid) : 0;
  return {
    cleanestRegion: cleanest.region,
    cleanestIntensity: target,
    currentTotalCo2: current,
    shiftedTotalCo2: shifted,
    savedFraction,
  };
}
