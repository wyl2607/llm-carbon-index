/**
 * Illustrative real-world equivalents for communication.
 * Sources documented in tooltips and methodology.
 * Conservative round numbers. All functions take avoided kg CO2 (mid) and return rounded whole numbers.
 * NOT carbon credits or precise offsets.
 */

export interface Equivalents {
  cars: number;      // passenger vehicles removed for 1 year
  flights: number;   // one-way economy transatlantic flights (approx 1 tCO2e)
  trees: number;     // mature trees sequestering for 1 year (~22 kg/tree/yr)
  homes: number;     // average US household annual electricity emissions
}

const CAR_KG_PER_YEAR = 4600;   // EPA average light-duty vehicle
const FLIGHT_KG = 1000;         // conservative one-way economy transatlantic
const TREE_KG_PER_YEAR = 22;    // USFS / average
const HOME_KG_PER_YEAR = 4200;  // rough US avg (kWh * grid factor)

export function computeEquivalents(avoidedKg: number): Equivalents {
  if (avoidedKg <= 0) return { cars: 0, flights: 0, trees: 0, homes: 0 };
  return {
    cars: Math.max(0, Math.round((avoidedKg * 365) / CAR_KG_PER_YEAR)),
    flights: Math.max(0, Math.round(avoidedKg / FLIGHT_KG)),
    trees: Math.max(0, Math.round((avoidedKg * 365) / TREE_KG_PER_YEAR)),
    homes: Math.max(0, Math.round((avoidedKg * 365) / HOME_KG_PER_YEAR)),
  };
}

export const EQUIV_SOURCES = 
  'EPA (vehicles), Our World in Data / DEFRA (flights), USFS (trees), EIA + eGRID averages (homes). Rounded for communication.';
