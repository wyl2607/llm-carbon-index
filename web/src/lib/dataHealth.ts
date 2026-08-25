import type { LatestData, OutputManifest } from '../types';

export interface DataHealth {
  overall: number | null;
  freshness: number | null;
  freshnessDays: number | null;
  provenance: number | null;
  coverage: number | null;
  reproducibility: number | null;
  manifestEvidence: boolean;
}

const DAY_MS = 86400000;

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function fractionScore(value: number | null | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value)
    ? clampScore(value * 100)
    : null;
}

function freshnessScore(days: number | null): number | null {
  if (days === null) return null;
  if (days <= 3) return 100;
  if (days <= 7) return 80;
  if (days <= 14) return 40;
  return 0;
}

function dataAgeDays(dataDate: string, now: Date): number | null {
  const parsed = Date.parse(`${dataDate}T00:00:00Z`);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.floor((now.getTime() - parsed) / DAY_MS));
}

export function calculateDataHealth(
  data: LatestData,
  manifest: OutputManifest | null,
  now: Date = new Date(),
): DataHealth {
  const freshnessDays = dataAgeDays(data.data_date, now);
  const freshness = freshnessScore(freshnessDays);
  const provenance = fractionScore(data.totals.mapped_traffic_fraction);
  const coverage = fractionScore(data.totals.modeled_traffic_fraction);
  const manifestRun = [...(manifest?.runs ?? [])]
    .reverse()
    .find((run) => run.data_date === data.data_date);
  const manifestEvidence = Boolean(manifestRun?.code_git_sha && manifestRun?.output_sha256);
  const reproducibility = manifestEvidence ? 100 : null;

  const weighted = [
    { value: freshness, weight: 0.3 },
    { value: provenance, weight: 0.3 },
    { value: coverage, weight: 0.2 },
    { value: reproducibility, weight: 0.2 },
  ].filter((metric): metric is { value: number; weight: number } => metric.value !== null);
  const totalWeight = weighted.reduce((sum, metric) => sum + metric.weight, 0);
  const overall = totalWeight === 0
    ? null
    : clampScore(weighted.reduce((sum, metric) => sum + metric.value * metric.weight, 0) / totalWeight);

  return {
    overall,
    freshness,
    freshnessDays,
    provenance,
    coverage,
    reproducibility,
    manifestEvidence,
  };
}
