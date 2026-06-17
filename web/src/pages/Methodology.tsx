import { usePageData } from '../lib/outletContext';
import { useI18n } from '../lib/i18n';
import { ExternalLink, ShieldAlert } from 'lucide-react';

export default function Methodology() {
  const { data, lang } = usePageData();
  const tt = useI18n(lang);

  const assumptionRows: { label: string; value?: string | number }[] = [
    { label: tt.methAssumIoRatio, value: data.assumptions.input_output_ratio },
    { label: tt.methAssumPue, value: data.assumptions.pue_band ?? data.assumptions.default_pue },
    { label: tt.methAssumPrefill, value: data.assumptions.prefill_alpha },
    { label: tt.methAssumEmbodied, value: data.assumptions.embodied_ratio_of_operational },
    { label: tt.methAssumWater, value: data.assumptions.water_l_per_kwh },
  ].filter(r => r.value != null);

  return (
    <div className="pt-8 pb-4 space-y-8 max-w-4xl">
      <header className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-black tracking-[-0.02em]">{tt.methTitle}</h1>
        <p className="text-[var(--text-secondary)]">
          {tt.methVersionLine(data.methodology_version, data.data_date)}
        </p>
      </header>

      {/* Scope statement — non-negotiable */}
      <section className="card p-6 border-[var(--accent-border)] bg-[var(--accent-bg)]">
        <div className="flex items-start gap-3">
          <ShieldAlert size={20} className="text-[var(--accent)] shrink-0 mt-0.5" />
          <div>
            <h2 className="font-bold text-[var(--accent)] mb-1">{tt.methScopeTitle}</h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{data.scope_note}</p>
          </div>
        </div>
      </section>

      {/* How the estimate is built */}
      <section className="card p-6 space-y-3">
        <h2 className="font-bold">{tt.methChainTitle}</h2>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{tt.methChainBody}</p>
        <div className="font-mono text-xs bg-[var(--bg-elev)] border border-[var(--border)] rounded-xl p-4 text-[var(--text-secondary)] overflow-x-auto">
          tokens → Wh (EcoLogits / AI Energy Score) × PUE → kWh × gCO₂/kWh ÷ 1000 → kg CO₂ {'{low, mid, high}'}
        </div>
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">{tt.methUncertaintyBody}</p>
      </section>

      {/* Assumptions */}
      <section className="card p-6">
        <h2 className="font-bold mb-4">{tt.methAssumTitle}</h2>
        <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-[var(--border)]">
              {assumptionRows.map((r, i) => (
                <tr key={r.label} className={i % 2 ? 'bg-[var(--row-stripe)]' : ''}>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{r.label}</td>
                  <td className="px-4 py-3 text-right font-mono text-[var(--text)]">{r.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Data sources */}
      {data.sources && data.sources.length > 0 && (
        <section className="card p-6">
          <h2 className="font-bold mb-4">{tt.methSourcesTitle}</h2>
          <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
            <table className="min-w-[640px] w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  <th className="px-4 py-3 border-b border-[var(--border)]">{tt.methSrcColTitle}</th>
                  <th className="px-4 py-3 border-b border-[var(--border)]">{tt.methSrcColPublisher}</th>
                  <th className="px-4 py-3 border-b border-[var(--border)]">{tt.methSrcColVersion}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {data.sources.map((s, i) => (
                  <tr key={s.id} className={i % 2 ? 'bg-[var(--row-stripe)]' : ''}>
                    <td className="px-4 py-3">
                      <a href={s.url} target="_blank" rel="noreferrer" className="text-[var(--accent)] hover:underline inline-flex items-center gap-1">
                        {s.title} <ExternalLink size={12} />
                      </a>
                      <div className="text-[11px] text-[var(--text-muted)] font-mono">{s.id}</div>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{s.publisher}</td>
                    <td className="px-4 py-3 font-mono text-[var(--text-muted)]">{s.version}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Attributions */}
      <section className="card p-6 space-y-2">
        <h2 className="font-bold">{tt.methAttribTitle}</h2>
        <p className="text-sm text-[var(--text-secondary)] font-mono">{data.source_citation}</p>
        <p className="text-xs text-[var(--text-muted)]">{tt.methAttribEm}</p>
      </section>

      <div className="flex flex-wrap gap-3">
        <a href="https://github.com/wyl2607/llm-carbon-index/blob/main/docs/methodology.md" target="_blank" rel="noreferrer" className="btn btn-primary text-sm px-6 py-3">
          {tt.methFullDoc} <ExternalLink size={14} />
        </a>
        <a href={`${import.meta.env.BASE_URL}data/latest.json`} target="_blank" rel="noreferrer" className="btn btn-secondary text-sm px-6 py-3">
          {tt.rawJson}
        </a>
      </div>
    </div>
  );
}
