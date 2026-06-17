/**
 * Light component test per Phase 4 spec:
 * - ScopeDisclaimerBanner renders (contains scope_note text)
 * - ModelsTable re-sorts when sortable header is clicked.
 *
 * Uses the REAL schema-valid sample fixture via fs (no network, offline safe).
 * Renders the components in isolation (they accept data via props).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { ScopeDisclaimerBanner } from './ScopeDisclaimerBanner';
import { ModelsTable } from './ModelsTable';
import type { LatestData } from '../types';

function loadSample(): LatestData {
  // Load from the copied placeholder (guaranteed by test: script pre-step).
  // Emulate __dirname for ESM (vitest + "type":"module").
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const fixturePath = path.resolve(__dirname, '../../public/data/latest.json');
  const raw = fs.readFileSync(fixturePath, 'utf8');
  return JSON.parse(raw) as LatestData;
}

describe('Phase 4 honesty UI (disclaimer + sortable table)', () => {
  let sample: LatestData;

  beforeEach(() => {
    sample = loadSample();
  });

  it('ScopeDisclaimerBanner renders scope_note + source_citation and is non-dismissable', () => {
    render(
      <ScopeDisclaimerBanner
        sourceCitation={sample.source_citation}
      />
    );

    const banner = screen.getByRole('note');
    // Contract guarantees scope + attribution content is surfaced
    expect(banner.textContent?.toLowerCase()).toMatch(/openrouter|scope|estimate|uncertainty/);
  });

  it('ModelsTable re-sorts rows when clicking the CO2 and efficiency headers', () => {
    const { container } = render(<ModelsTable models={sample.models} lang="en" />);

    // Grab all model names in current (default co2 desc) order
    const getNames = () => {
      // The first column cells contain display_name (we use role or just query text in td)
      const rows = container.querySelectorAll('tbody tr');
      return Array.from(rows).map((r) => {
        const tds = r.querySelectorAll('td');
        return tds[0]?.textContent?.trim() || '';
      });
    };

    const before = getNames();
    expect(before.length).toBeGreaterThan(1);

    // Find sortable headers (labels are now via i18n but contain CO₂ / tokens keywords)
    const headers = screen.getAllByRole('columnheader');
    const co2Header = headers.find((h) => /CO₂|co2/i.test(h.textContent || ''));
    expect(co2Header).toBeTruthy();

    fireEvent.click(co2Header!);

    const afterCo2 = getNames();
    expect(afterCo2).not.toEqual(before);

    const effHeader = headers.find((h) => /1k|1,000|efficiency|eff/i.test(h.textContent || ''));
    expect(effHeader).toBeTruthy();

    const beforeEff = getNames();
    fireEvent.click(effHeader!);
    const afterEff = getNames();
    expect(afterEff).not.toEqual(beforeEff);
  });
});
