import type { Range } from '../types';

/**
 * Format helpers enforcing the honesty rules from ENGINEERING_STANDARDS §2 and
 * phase-4-frontend.md + user spec:
 * - NEVER render a bare point number for energy/CO2 — always mid + range.
 * - Format big numbers: T tokens; kg or t CO2.
 * - Surface modeled_traffic_fraction.
 */

// Display locale follows the selected UI language so separators read naturally for
// each audience (en/zh: 1,234.5 ; de: 1.234,5 for the German/EU ESG audience).
// Pinned per-language (not browser-derived) so every number on the page — KPIs,
// ranges, the table, equivalents — uses one consistent thousands/decimal style.
const LOCALE_BY_LANG: Record<string, string> = {
  en: 'en-US',
  zh: 'zh-CN',
  de: 'de-DE',
};

let displayLocale = LOCALE_BY_LANG.en;

/** Set the active display locale from the UI language. App calls this once per render. */
export function setDisplayLocale(lang: string): void {
  displayLocale = LOCALE_BY_LANG[lang] ?? LOCALE_BY_LANG.en;
}

/** Format a number in the active display locale. */
export function nf(value: number, opts?: Intl.NumberFormatOptions): string {
  return value.toLocaleString(displayLocale, opts);
}

export function formatTokens(n: number): string {
  if (n >= 1e12) return nf(n / 1e12, { maximumFractionDigits: 1 }) + ' T';
  if (n >= 1e9) return nf(n / 1e9, { maximumFractionDigits: 1 }) + ' B';
  return nf(n);
}

export function formatCO2Range(r: Range): string {
  // Use tonnes when mid >= 1000 kg, else kg. Always show low–high range.
  const useTonnes = r.mid >= 1000;
  const scale = useTonnes ? 1000 : 1;
  const unit = useTonnes ? 't' : 'kg';
  const fmt = (v: number) =>
    nf(v / scale, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return `${fmt(r.mid)} ${unit} (${fmt(r.low)}–${fmt(r.high)} ${unit})`;
}

export function formatWaterRange(r: Range | undefined): string {
  if (!r) return "N/A";
  // Use kL when mid >= 1000 L, else L.
  const useKL = r.mid >= 1000;
  const scale = useKL ? 1000 : 1;
  const unit = useKL ? 'kL' : 'L';
  const fmt = (v: number) =>
    nf(v / scale, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return `${fmt(r.mid)} ${unit} (${fmt(r.low)}–${fmt(r.high)} ${unit})`;
}

/**
 * CO₂ per 1 000 output tokens (kg CO2 mid / est_output_tokens * 1000)
 * Returned in grams for human scale (typical values << 1 kg).
 */
export function co2Per1kOutputTokens(model: { co2_kg: Range; est_output_tokens: number }): number {
  if (!model.est_output_tokens || model.est_output_tokens <= 0) return 0;
  const kgPer1k = (model.co2_kg.mid / model.est_output_tokens) * 1000;
  return kgPer1k * 1000; // grams
}

export function formatCO2Per1kG(g: number): string {
  // Show 2 decimals for g/1k ; very small values possible.
  return nf(g, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' g CO₂ / 1k output tokens';
}

export function formatModeledFraction(f: number, unmappedFraction: number = 0): string {
  const pct = nf(f * 100, { maximumFractionDigits: 1 });
  let s = `We model ${pct}% of the day's tokens (modeled_traffic_fraction).`;
  if (unmappedFraction > 0) {
    const upct = nf(unmappedFraction * 100, { maximumFractionDigits: 1 });
    s += ` ${upct}% of tracked traffic runs on models without crosswalk entries (unmapped_traffic_fraction) — shown as estimates only.`;
  }
  return s;
}

export function formatDate(d: string): string {
  // data_date like 2026-06-14
  return d;
}
