/**
 * Types matching docs/DATA_SCHEMAS.md §1 (latest.json / history/*.json)
 * Range is the non-negotiable {low, mid, high} with low ≤ mid ≤ high.
 * The frontend must NEVER collapse ranges to a bare point estimate.
 */
export interface Range {
  low: number;
  mid: number;
  high: number;
}

export type Origin = 'CN' | 'US' | 'EU' | 'OTHER';
export type OpenOrClosed = 'open' | 'closed';
export type EnergySource = 'ai_energy_score' | 'ecologits' | 'parameter_class_fallback';
export type GridSource = 'electricity_maps_live' | 'annual_factor';

export interface Model {
  slug: string;
  display_name: string;
  origin: Origin;
  open_or_closed: OpenOrClosed;
  total_tokens: number;
  est_output_tokens: number;
  wh_per_output_token: Range;
  energy_kwh: Range;
  energy_source: EnergySource | string;
  region: string;
  carbon_intensity_gco2_kwh: number;
  grid_source: GridSource | string;
  pue: number;
  co2_kg: Range;
  co2_kg_market?: Range;
  renewable_match_pct?: number | null;
  wue?: number;
  water_liters?: Range;
  flags: string[];
}

export interface Totals {
  total_tokens: number;
  uncovered_tokens: number;
  modeled_traffic_fraction: number;
  mapped_traffic_fraction: number;
  unmapped_tokens: number;
  unmapped_traffic_fraction: number;
  unmapped_slugs: { slug: string; total_tokens: number }[];
  est_output_tokens?: number;
  energy_kwh?: Range;
  co2_kg: Range;
  co2_kg_market?: Range;
  water_liters?: Range;
  by_origin: Record<string, { co2_kg: Range, co2_kg_market?: Range, water_liters?: Range }>;
  by_open_closed: Record<string, { co2_kg: Range, co2_kg_market?: Range, water_liters?: Range }>;
}

export interface LatestData {
  methodology_version: string;
  generated_at: string;
  data_date: string;
  source_citation: string;
  scope_note: string;
  assumptions: {
    input_output_ratio: string;
    default_pue: number;
  };
  models: Model[];
  totals: Totals;
}

export interface TimeseriesDay {
  data_date: string;
  totals: Totals;
}
