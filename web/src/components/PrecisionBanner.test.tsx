/**
 * Phase 6F component test:
 * - PrecisionBanner renders and reflects 0%/0% from the real fixture JSON.
 * - It is always visible (role=note) and surfaces the measured/live tier copy.
 *
 * Loads the schema-valid latest.json copied into public/data (offline, no network).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { PrecisionBanner } from './PrecisionBanner';
import type { LatestData } from '../types';

function loadSample(): LatestData {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const fixturePath = path.resolve(__dirname, '../../public/data/latest.json');
  return JSON.parse(fs.readFileSync(fixturePath, 'utf8')) as LatestData;
}

describe('Phase 6F estimation-tier honesty (PrecisionBanner)', () => {
  let sample: LatestData;

  beforeEach(() => {
    sample = loadSample();
  });

  it('exposes a totals.precision block in the fixture', () => {
    expect(sample.totals.precision).toBeTruthy();
    const p = sample.totals.precision!;
    // each axis sums to 1.0
    expect(p.energy_measured_fraction + p.energy_class_fallback_fraction).toBeCloseTo(1.0, 6);
    expect(p.grid_live_fraction + p.grid_annual_fallback_fraction).toBeCloseTo(1.0, 6);
  });

  it('renders an always-visible note reflecting 0% measured / 0% live for today\'s data', () => {
    render(<PrecisionBanner precision={sample.totals.precision} lang="en" />);
    const banner = screen.getByRole('note');
    // today's reality: all fallback -> 0% measured energy, 0% live grid
    expect(banner.textContent).toMatch(/0% measured energy/);
    expect(banner.textContent).toMatch(/0% live grid/);
  });

  it('reflects a mixed precision block when one is supplied', () => {
    render(
      <PrecisionBanner
        precision={{
          energy_measured_fraction: 0.7,
          energy_class_fallback_fraction: 0.3,
          grid_live_fraction: 0.6,
          grid_annual_fallback_fraction: 0.4,
          models_measured: 2,
          models_total: 3,
          grid_live_models: 1,
        }}
        lang="en"
      />,
    );
    const banner = screen.getByRole('note');
    expect(banner.textContent).toMatch(/70% measured energy/);
    expect(banner.textContent).toMatch(/60% live grid/);
  });

  it('renders nothing when precision is absent (backward compatible)', () => {
    const { container } = render(<PrecisionBanner precision={undefined} lang="en" />);
    expect(container.firstChild).toBeNull();
  });
});
