import type { LatestData, Range } from '../types';

/**
 * P7: ESG/CSRD Scope-2 dual-reporting export builder (client side, from loaded latest.json).
 * Re-uses exactly the {low,mid,high} from totals.co2_kg (location-based) and
 * totals.co2_kg_market (market-based). No fabrication of numbers.
 *
 * The project scope/uncertainty caveat is embedded verbatim in the returned
 * object (and thus in every downloaded file) and is non-removable.
 */

export const SCOPE_CAVEAT =
  'This project estimates the CO₂ footprint of OpenRouter-visible LLM inference — ' +
  'a representative but partial slice of global AI usage. It is NOT a ' +
  'measurement of total global data-center emissions. All figures are estimates ' +
  'with uncertainty ranges, not measurements.';

export interface EsgScope2 {
  location_based: Range;
  market_based: Range;
}

export interface EsgEsrsE1 {
  standard: string;
  disclosure: string;
  line_item: string;
  location_based_kgco2e: Range;
  market_based_kgco2e: Range;
  modeled_traffic_fraction: number;
  note: string;
}

export interface EsgExport {
  data_date: string;
  methodology_version: string;
  scope_caveat: string;
  scope_2: EsgScope2;
  esrs_e1: EsgEsrsE1;
  source_citation: string;
}

export function buildEsgExport(data: LatestData): EsgExport {
  if (!data || !data.totals) {
    throw new Error('buildEsgExport: invalid latest data (no totals)');
  }
  const t = data.totals;
  const loc: Range = t.co2_kg;
  // market-based may fall back to loc only if absent, but per pipeline it is always present
  const mkt: Range = t.co2_kg_market || loc;

  const modeled = typeof t.modeled_traffic_fraction === 'number' ? t.modeled_traffic_fraction : 0;

  return {
    data_date: data.data_date,
    methodology_version: data.methodology_version,
    scope_caveat: SCOPE_CAVEAT,
    scope_2: {
      location_based: { low: loc.low, mid: loc.mid, high: loc.high },
      market_based: { low: mkt.low, mid: mkt.mid, high: mkt.high },
    },
    esrs_e1: {
      standard: 'ESRS E1 Climate Change',
      disclosure: 'E1-6 Gross Scopes 1, 2, 3 and Total GHG emissions',
      line_item:
        'Scope 2 purchased energy (location-based vs market-based) — estimated from OpenRouter-visible LLM inference traffic (proxy for Scope 3 Category 1 purchased services)',
      location_based_kgco2e: { low: loc.low, mid: loc.mid, high: loc.high },
      market_based_kgco2e: { low: mkt.low, mid: mkt.mid, high: mkt.high },
      modeled_traffic_fraction: modeled,
      note: 'Ranges carried end-to-end from totals; no collapse to point values. Dual reporting follows GHG Protocol Scope 2. Scale by modeled_traffic_fraction for full inventory. Full uncertainty and partial-coverage statement is in scope_caveat (non-removable).',
    },
    source_citation: data.source_citation || '',
  };
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.visibility = 'hidden';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadEsgJson(esg: EsgExport): void {
  const blob = new Blob([JSON.stringify(esg, null, 2)], {
    type: 'application/json;charset=utf-8;',
  });
  const fname = `llm-carbon-index-esg-scope2-${esg.data_date}.json`;
  triggerDownload(blob, fname);
}

export function downloadEsgCsv(esg: EsgExport): void {
  // Single-row CSV with ranges expanded + the full non-removable caveat in its column.
  // CSV is intentionally denormalized for direct import into ESG spreadsheets.
  const headers = [
    'data_date',
    'methodology_version',
    'scope_caveat',
    'location_based_low_kgco2e',
    'location_based_mid_kgco2e',
    'location_based_high_kgco2e',
    'market_based_low_kgco2e',
    'market_based_mid_kgco2e',
    'market_based_high_kgco2e',
    'esrs_e1_standard',
    'esrs_e1_line_item',
    'modeled_traffic_fraction',
    'source_citation',
  ];

  const row = [
    esg.data_date,
    esg.methodology_version,
    esg.scope_caveat, // non-removable, full text present in the artifact
    esg.scope_2.location_based.low,
    esg.scope_2.location_based.mid,
    esg.scope_2.location_based.high,
    esg.scope_2.market_based.low,
    esg.scope_2.market_based.mid,
    esg.scope_2.market_based.high,
    esg.esrs_e1.standard,
    esg.esrs_e1.line_item,
    esg.esrs_e1.modeled_traffic_fraction,
    esg.source_citation,
  ];

  const escape = (v: string | number): string => {
    const s = String(v).replace(/"/g, '""');
    return `"${s}"`;
  };

  const csv = [headers.map(escape).join(','), row.map(escape).join(',')].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const fname = `llm-carbon-index-esg-scope2-${esg.data_date}.csv`;
  triggerDownload(blob, fname);
}
