import { usePageData } from '../lib/outletContext';
import { useI18n } from '../lib/i18n';
import { buildRecommendations } from '../lib/recommend';
import { greenGrade } from '../lib/rankings';
import { GreenGradeBadge } from '../components/GreenGradeBadge';
import { shiftedCo2Kg } from '../lib/scenario';
import { formatCO2Per1kGShort, nf } from '../lib/format';
import { ArrowRight, Lightbulb, Zap } from 'lucide-react';

export default function Recommendations() {
  const { data, lang, setInspectModel } = usePageData();
  const tt = useI18n(lang);

  const recs = buildRecommendations(data.models);

  // Green-grid callout: total operational CO₂ today vs at a 100% low-carbon grid
  // (scenario.shiftedCo2Kg — same transform as the Overview What-If lab).
  const baseMid = data.models.reduce((s, m) => s + m.co2_kg.mid, 0);
  const greenMid = data.models.reduce(
    (s, m) => s + shiftedCo2Kg(m.energy_kwh.mid, m.pue, m.carbon_intensity_gco2_kwh, 100),
    0,
  );
  const gridSavedPct = baseMid > 0 ? ((baseMid - greenMid) / baseMid) * 100 : 0;

  return (
    <div className="pt-8 pb-4 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-black tracking-[-0.02em]">{tt.recTitle}</h1>
        <p className="text-[var(--text-secondary)] max-w-3xl">{tt.recIntro}</p>
        <p className="text-xs text-[var(--text-muted)] italic max-w-3xl">{tt.rankTokenizerNote}</p>
      </header>

      {/* Two levers: switch model + cleaner grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card p-5 flex items-start gap-3">
          <Lightbulb size={20} className="text-[var(--accent)] shrink-0 mt-0.5" />
          <div>
            <div className="font-bold mb-0.5">{tt.recLever1Title}</div>
            <p className="text-sm text-[var(--text-secondary)]">{tt.recLever1Body}</p>
          </div>
        </div>
        <div className="card p-5 flex items-start gap-3">
          <Zap size={20} className="text-[var(--accent)] shrink-0 mt-0.5" />
          <div>
            <div className="font-bold mb-0.5">{tt.recLever2Title}</div>
            <p className="text-sm text-[var(--text-secondary)]">
              {tt.recLever2Body(nf(gridSavedPct, { maximumFractionDigits: 0 }))}
            </p>
          </div>
        </div>
      </div>

      {/* Switch table */}
      <section className="card p-6">
        <div className="mb-4">
          <h2 className="font-bold">{tt.recSwitchTitle}</h2>
          <p className="text-xs text-[var(--text-muted)]">{tt.recSwitchSub}</p>
        </div>
        {recs.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] py-6 text-center">{tt.recNone}</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
            <table className="min-w-[720px] w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  <th className="px-4 py-3 border-b border-[var(--border)]">{tt.recColCurrent}</th>
                  <th className="px-4 py-3 border-b border-[var(--border)]">{tt.recColGreener}</th>
                  <th className="px-4 py-3 text-right border-b border-[var(--border)]">{tt.recColSaving}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {recs.map((r, i) => (
                  <tr key={r.model.slug} className={i % 2 ? 'bg-[var(--row-stripe)]' : ''}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <GreenGradeBadge grade={greenGrade(r.modelEffMid)} />
                        <button onClick={() => setInspectModel(r.model)} className="font-semibold hover:text-[var(--accent)] transition-colors text-left">
                          {r.model.display_name}
                        </button>
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5 pl-8">{formatCO2Per1kGShort(r.modelEffMid)} / 1k</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ArrowRight size={14} className="text-[var(--text-muted)]" />
                        <GreenGradeBadge grade={greenGrade(r.altEffMid)} />
                        <button onClick={() => setInspectModel(r.alternative)} className="font-semibold text-[var(--accent)] hover:underline text-left">
                          {r.alternative.display_name}
                        </button>
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] font-mono mt-0.5 pl-12">{formatCO2Per1kGShort(r.altEffMid)} / 1k</div>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="font-mono font-bold text-[var(--accent)]">
                        −{nf(r.savedFraction.mid * 100, { maximumFractionDigits: 0 })}%
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] font-mono">
                        {nf(r.savedFraction.low * 100, { maximumFractionDigits: 0 })}–{nf(r.savedFraction.high * 100, { maximumFractionDigits: 0 })}%
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[11px] text-[var(--text-muted)] mt-3 leading-relaxed">{tt.recNote}</p>
      </section>
    </div>
  );
}
