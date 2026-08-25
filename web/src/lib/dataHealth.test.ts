import { describe, expect, it } from 'vitest';
import type { LatestData, OutputManifest } from '../types';
import { calculateDataHealth } from './dataHealth';

function makeData(dataDate: string, mapped = 0.5, modeled = 0.9): LatestData {
  return {
    methodology_version: '0.8.0',
    generated_at: `${dataDate}T07:00:00Z`,
    data_date: dataDate,
    source_citation: 'test',
    scope_note: 'test',
    assumptions: { input_output_ratio: '1' },
    models: [],
    totals: {
      total_tokens: 100,
      uncovered_tokens: 0,
      modeled_traffic_fraction: modeled,
      mapped_traffic_fraction: mapped,
      unmapped_tokens: 0,
      unmapped_traffic_fraction: 1 - mapped,
      unmapped_slugs: [],
      co2_kg: { low: 0, mid: 0, high: 0 },
      by_origin: {},
      by_open_closed: {},
    },
  };
}

describe('calculateDataHealth', () => {
  const now = new Date('2026-08-25T12:00:00Z');

  it('scores freshness against the visible data date', () => {
    expect(calculateDataHealth(makeData('2026-08-23'), null, now).freshness).toBe(100);
    expect(calculateDataHealth(makeData('2026-08-18'), null, now).freshness).toBe(80);
    expect(calculateDataHealth(makeData('2026-08-10'), null, now).freshness).toBe(40);
    expect(calculateDataHealth(makeData('2026-08-01'), null, now).freshness).toBe(0);
  });

  it('turns coverage fractions into bounded percentage scores', () => {
    const health = calculateDataHealth(makeData('2026-08-25', 0.5129, 0.9353), null, now);
    expect(health.provenance).toBe(51);
    expect(health.coverage).toBe(94);
  });

  it('requires a matching manifest record for reproducibility evidence', () => {
    const data = makeData('2026-08-18');
    const manifest: OutputManifest = {
      runs: [{ data_date: '2026-08-18', code_git_sha: 'abc123', output_sha256: 'sha256:def456' }],
    };
    expect(calculateDataHealth(data, manifest, now).reproducibility).toBe(100);
    expect(calculateDataHealth(data, null, now).reproducibility).toBeNull();
  });

  it('does not convert missing evidence into a zero score', () => {
    const health = calculateDataHealth(makeData('2026-08-18'), null, now);
    expect(health.reproducibility).toBeNull();
    expect(health.overall).not.toBeNull();
  });
});
