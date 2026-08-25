import type { Lang } from '../lib/i18n';
import { useI18n } from '../lib/i18n';
import type { LatestData, OutputManifest } from '../types';
import { calculateDataHealth } from '../lib/dataHealth';

interface DataHealthPanelProps {
  data: LatestData;
  manifest: OutputManifest | null;
  nowMs: number;
  lang: Lang;
}

function percent(value: number | null | undefined): string | null {
  return typeof value === 'number' && Number.isFinite(value)
    ? `${Math.round(value * 100)}%`
    : null;
}

export function DataHealthPanel({ data, manifest, nowMs, lang }: DataHealthPanelProps) {
  const tt = useI18n(lang);
  const health = calculateDataHealth(data, manifest, new Date(nowMs));
  const mappedPercent = percent(data.totals.mapped_traffic_fraction);
  const modeledPercent = percent(data.totals.modeled_traffic_fraction);
  const freshnessDetail = health.freshnessDays === null
    ? tt.dataHealthUnknown
    : tt.dataHealthFreshnessDetail(String(health.freshnessDays));
  const provenanceDetail = mappedPercent === null
    ? tt.dataHealthUnknown
    : tt.dataHealthProvenanceDetail(mappedPercent);
  const coverageDetail = modeledPercent === null
    ? tt.dataHealthUnknown
    : tt.dataHealthCoverageDetail(modeledPercent);
  const reproducibilityState = health.manifestEvidence
    ? tt.dataHealthManifested
    : tt.dataHealthUnknown;
  const metrics = [
    { label: tt.dataHealthFreshness, score: health.freshness, detail: freshnessDetail },
    { label: tt.dataHealthProvenance, score: health.provenance, detail: provenanceDetail },
    { label: tt.dataHealthCoverage, score: health.coverage, detail: coverageDetail },
    {
      label: tt.dataHealthReproducibility,
      score: health.reproducibility,
      detail: tt.dataHealthReproDetail(reproducibilityState),
    },
  ];
  const overall = health.overall === null
    ? tt.dataHealthUnknown
    : tt.dataHealthOverall(String(health.overall));

  return (
    <section className="card p-6" aria-labelledby="data-health-title">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
        <div>
          <h2 id="data-health-title" className="font-bold text-lg">{tt.dataHealthTitle}</h2>
          <p className="text-xs text-[var(--text-muted)] mt-1 max-w-3xl leading-relaxed">
            {tt.dataHealthSubtitle}
          </p>
        </div>
        <div className="shrink-0 rounded-xl border border-[var(--accent-border)] bg-[var(--accent-bg)] px-4 py-3 text-right">
          <div className="text-[10px] uppercase tracking-widest text-[var(--accent)] font-bold">{tt.dataHealthOverall(health.overall === null ? tt.dataHealthUnknown : String(health.overall))}</div>
          <div className="text-xs text-[var(--text-muted)] mt-1">{data.data_date}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {metrics.map((metric) => {
          const width = metric.score === null ? 0 : Math.max(0, Math.min(100, metric.score));
          const scoreLabel = metric.score === null ? tt.dataHealthUnknown : `${metric.score}/100`;
          return (
            <div key={metric.label} className="rounded-xl border border-[var(--border)] bg-[var(--bg-elev)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm font-semibold">{metric.label}</div>
                <div className="text-xs font-mono text-[var(--accent)] text-right">{scoreLabel}</div>
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-[var(--border)] overflow-hidden" aria-hidden="true">
                <div className="h-full rounded-full bg-[var(--accent)] transition-all" style={{ width: `${width}%` }} />
              </div>
              <p className="mt-3 text-xs text-[var(--text-muted)] leading-relaxed">{metric.detail}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
