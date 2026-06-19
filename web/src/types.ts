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
export type GridSource = 'electricity_maps_live' | 'eia_live' | 'annual_factor';

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
  energy_source_id?: string;
  region: string;
  carbon_intensity_gco2_kwh: number;
  grid_source: GridSource | string;
  grid_source_id?: string;
  pue: number;
  co2_kg: Range;
  co2_kg_embodied?: Range;
  co2_kg_total?: Range;
  co2_kg_market?: Range;
  renewable_match_pct?: number | null;
  wue?: number;
  water_liters?: Range;
  flags: string[];
  // Efficiency-frontier / rightsizing (spec specs/efficiency-frontier.md §6). Present
  // once the frontier pipeline has run; null/absent for models without a capability score.
  capability_index?: number | null;
  capability_source_id?: string | null;
  energy_wh_per_mtok?: Range;
  on_frontier?: boolean;
  frontier_reference_slug?: string | null;
  rightsizing_gap_pct?: Range | null;
  avoidable_co2_kg?: Range | null;
}

export interface FleetRightsizing {
  basis: string;
  avoidable_co2_kg: Range;
  avoidable_pct_of_total: Range;
  models_included: number;
  models_excluded_low_confidence: number;
  capability_index_version: string;
  capability_index_accessed: string;
}

export interface Precision {
  energy_measured_fraction: number;
  energy_class_fallback_fraction: number;
  grid_live_fraction: number;
  grid_annual_fallback_fraction: number;
  models_measured: number;
  models_total: number;
  grid_live_models: number;
}

export interface RankStabilityBoard {
  top_n: number;
  ranks_changed: number;
  max_displacement: number;
}

export interface Fairness {
  rank_stability: {
    by_co2: RankStabilityBoard;
    by_efficiency: RankStabilityBoard;
  };
  unweighted: { co2_kg: Range };
}

export interface Totals {
  total_tokens: number;
  uncovered_tokens: number;
  modeled_traffic_fraction: number;
  precision?: Precision;
  fairness?: Fairness;
  mapped_traffic_fraction: number;
  unmapped_tokens: number;
  unmapped_traffic_fraction: number;
  unmapped_slugs: { slug: string; total_tokens: number }[];
  est_output_tokens?: number;
  energy_kwh?: Range;
  co2_kg: Range;
  co2_kg_embodied?: Range;
  co2_kg_total?: Range;
  co2_kg_market?: Range;
  water_liters?: Range;
  by_origin: Record<string, { co2_kg: Range, co2_kg_market?: Range, water_liters?: Range }>;
  by_open_closed: Record<string, { co2_kg: Range, co2_kg_market?: Range, water_liters?: Range }>;
}

export interface Source {
  id: string;
  title: string;
  publisher: string;
  url: string;
  version: string;
  accessed: string;
}

export interface LatestData {
  methodology_version: string;
  generated_at: string;
  data_date: string;
  source_citation: string;
  scope_note: string;
  assumptions: {
    input_output_ratio: string;
    default_pue?: number;
    pue_band?: string;
    prefill_alpha?: string;
    embodied_ratio_of_operational?: string;
    water_l_per_kwh?: string;
  };
  sources?: Source[];
  models: Model[];
  totals: Totals;
  fleet_rightsizing?: FleetRightsizing;
}

export interface TimeseriesDay {
  data_date: string;
  totals: Totals;
}

export interface SensitivityDriver {
  assumption: string;
  band: string[];
  total_co2_swing_pct: { low: number; high: number };
  rank: number;
}

export interface SensitivityData {
  data_date: string;
  drivers: SensitivityDriver[];
  dominant: string;
}
