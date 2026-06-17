import { usePageData } from '../lib/outletContext';
import { useI18n } from '../lib/i18n';
import { aggregateByRegion, bestRegionScenario } from '../lib/regions';
import { formatCO2Parts, nf } from '../lib/format';
import { Globe, Leaf } from 'lucide-react';

export default function Regions() {
  const { data, lang } = usePageData();
  const tt = useI18n(lang);

  const regions = aggregateByRegion(data.models);
  const scenario = bestRegionScenario(data.models);
  const totalMid = regions.reduce((s, r) => s + r.totalCo2Kg.mid, 0);

  return (
    <div className="pt-8 pb-4 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-black tracking-[-0.02em]">{tt.regTitle}</h1>
        <p className="text-[var(--text-secondary)] max-w-3xl">{tt.regIntro}</p>
      </header>

      {/* Best-region scenario callout */}
      {scenario && scenario.savedFraction > 0 && (
        <section className="card p-6 bg-[var(--accent-bg)] border-[var(--accent-border)]">
          <div className="flex items-start gap-3">
            <Leaf size={20} className="text-[var(--accent)] shrink-0 mt-0.5" />
            <div>
              <h2 className="font-bold text-[var(--accent)] mb-1">{tt.regBestTitle}</h2>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {tt.regBestBody(
                  tt.regionLabel(scenario.cleanestRegion),
                  nf(scenario.cleanestIntensity, { maximumFractionDigits: 0 }),
                  nf(scenario.savedFraction * 100, { maximumFractionDigits: 0 }),
                )}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-2 font-mono">
                {formatCO2Parts(scenario.currentTotalCo2).mid} {formatCO2Parts(scenario.currentTotalCo2).unit}
                {' → '}
                {formatCO2Parts(scenario.shiftedTotalCo2).mid} {formatCO2Parts(scenario.shiftedTotalCo2).unit}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Region breakdown table */}
      <section className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe size={18} className="text-[var(--text-secondary)]" />
          <h2 className="font-bold">{tt.regBreakdownTitle}</h2>
          <span className="text-xs text-[var(--text-muted)]">{tt.regCleanestFirst}</span>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
          <table className="min-w-[760px] w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                <th className="px-4 py-3 border-b border-[var(--border)]">{tt.regColRegion}</th>
                <th className="px-4 py-3 text-right border-b border-[var(--border)]">{tt.regColIntensity}</th>
                <th className="px-4 py-3 text-right border-b border-[var(--border)]">{tt.regColRenewable}</th>
                <th className="px-4 py-3 text-right border-b border-[var(--border)]">{tt.regColModels}</th>
                <th className="px-4 py-3 text-right border-b border-[var(--border)]">{tt.regColCo2}</th>
                <th className="px-4 py-3 text-right border-b border-[var(--border)]">{tt.regColShare}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {regions.map((r, i) => {
                const co2 = formatCO2Parts(r.totalCo2Kg);
                const share = totalMid > 0 ? (r.totalCo2Kg.mid / totalMid) * 100 : 0;
                return (
                  <tr key={r.region} className={i % 2 ? 'bg-[var(--row-stripe)]' : ''}>
                    <td className="px-4 py-3">
                      <span className="font-semibold">{tt.regionLabel(r.region)}</span>
                      {i === 0 && <span className="ml-2 badge badge-open">{tt.regCleanest}</span>}
                      <div className="text-[11px] text-[var(--text-muted)] font-mono">{r.region}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {nf(r.carbonIntensity, { maximumFractionDigits: 0 })} <span className="text-[var(--text-muted)]">g/kWh</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {r.renewablePct != null ? `${nf(r.renewablePct, { maximumFractionDigits: 0 })}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{r.modelCount}</td>
                    <td className="px-4 py-3 text-right font-mono whitespace-nowrap">
                      {co2.mid} <span className="text-[var(--text-muted)]">{co2.unit}</span>
                      <div className="text-[11px] text-[var(--text-muted)]">{co2.range} {co2.unit}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{nf(share, { maximumFractionDigits: 0 })}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-[var(--text-muted)] mt-3 leading-relaxed">{tt.regNote}</p>
      </section>
    </div>
  );
}
