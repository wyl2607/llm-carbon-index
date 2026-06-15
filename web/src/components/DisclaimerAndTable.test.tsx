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
        scopeNote={sample.scope_note}
        sourceCitation={sample.source_citation}
      />
    );

    // scope_note from the contract
    expect(screen.getByText(/Estimated CO2 footprint of LLM-inference traffic visible through OpenRouter/i)).toBeInTheDocument();
    // source citation
    expect(screen.getByText(/Source: OpenRouter \(openrouter.ai\/rankings\)/i)).toBeInTheDocument();
    // the full scope statement (embedded for PLAN.md compliance) lives inside the banner.
    // Use textContent because React splits it across <strong> children.
    const banner = screen.getByRole('note');
    expect(banner.textContent).toMatch(/NOT a measurement of total global data-center emissions/i);
  });

  it('ModelsTable re-sorts rows when clicking the CO2 and efficiency headers', () => {
    const { container } = render(<ModelsTable models={sample.models} />);

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

    // Find the "CO₂ (kg, range)" header — it is sortable
    const headers = screen.getAllByRole('columnheader');
    const co2Header = headers.find((h) => /CO₂ \(kg, range\)/i.test(h.textContent || ''));
    expect(co2Header).toBeTruthy();

    // Click it (currently desc, clicking flips to asc)
    fireEvent.click(co2Header!);

    const afterCo2 = getNames();
    // Order should have reversed for a non-sorted-identical set
    expect(afterCo2).not.toEqual(before);

    // Now click the efficiency header
    const effHeader = headers.find((h) => /CO₂ \/ 1k output tokens/i.test(h.textContent || ''));
    expect(effHeader).toBeTruthy();

    const beforeEff = getNames();
    fireEvent.click(effHeader!);
    const afterEff = getNames();
    expect(afterEff).not.toEqual(beforeEff);
  });
});
