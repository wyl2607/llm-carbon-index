import { usePageData } from '../lib/outletContext';
import { useI18n } from '../lib/i18n';
import { ModelsTable } from '../components/ModelsTable';
import { GreenGradeBadge } from '../components/GreenGradeBadge';
import { byEfficiency, byTotalCo2, greenGrade } from '../lib/rankings';
import { co2Per1kOutputTokens, formatCO2Parts, formatCO2Per1kGShort } from '../lib/format';
import type { Model } from '../types';
import { Leaf, Flame } from 'lucide-react';

export default function Rankings() {
  const { data, lang, setInspectModel } = usePageData();
  const tt = useI18n(lang);

  const greenest = byEfficiency(data.models).slice(0, 10);
  const biggest = byTotalCo2(data.models, 'desc').slice(0, 10);

  const originClass = (m: Model) =>
    m.origin === 'CN' ? 'badge-cn' : m.origin === 'US' ? 'badge-us' : m.origin === 'EU' ? 'badge-eu' : 'badge';

  return (
    <div className="pt-8 pb-4 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-black tracking-[-0.02em]">{tt.rankTitle}</h1>
        <p className="text-[var(--text-secondary)] max-w-3xl">{tt.rankIntro}</p>
        <p className="text-xs text-[var(--text-muted)] italic max-w-3xl">{tt.rankTokenizerNote}</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Greenest by efficiency */}
        <section className="card p-6">
          <div className="flex items-center gap-2 mb-1">
            <Leaf size={18} className="text-[var(--accent)]" />
            <h2 className="font-bold">{tt.rankGreenestTitle}</h2>
          </div>
          <p className="text-xs text-[var(--text-muted)] mb-4">{tt.rankGreenestSub}</p>
          <ol className="space-y-1.5">
            {greenest.map((m, i) => {
              const eff = co2Per1kOutputTokens(m);
              return (
                <li key={m.slug} className="flex items-center gap-3 py-1.5 border-b border-[var(--border)] last:border-0">
                  <span className="text-xs text-[var(--text-muted)] font-mono w-5">#{i + 1}</span>
                  <GreenGradeBadge grade={greenGrade(eff)} />
                  <button onClick={() => setInspectModel(m)} className="flex-1 text-left font-semibold hover:text-[var(--accent)] transition-colors truncate">
                    {m.display_name}
                  </button>
                  <span className={`badge ${originClass(m)}`}>{m.origin}</span>
                  <span className="font-mono text-sm text-[var(--accent)] whitespace-nowrap">{formatCO2Per1kGShort(eff)}</span>
                </li>
              );
            })}
          </ol>
          <p className="text-[11px] text-[var(--text-muted)] mt-3">{tt.rankEffUnit}</p>
        </section>

        {/* Biggest absolute footprint */}
        <section className="card p-6">
          <div className="flex items-center gap-2 mb-1">
            <Flame size={18} className="text-[var(--warning)]" />
            <h2 className="font-bold">{tt.rankBiggestTitle}</h2>
          </div>
          <p className="text-xs text-[var(--text-muted)] mb-4">{tt.rankBiggestSub}</p>
          <ol className="space-y-1.5">
            {biggest.map((m, i) => {
              const co2 = formatCO2Parts(m.co2_kg);
              return (
                <li key={m.slug} className="flex items-center gap-3 py-1.5 border-b border-[var(--border)] last:border-0">
                  <span className="text-xs text-[var(--text-muted)] font-mono w-5">#{i + 1}</span>
                  <button onClick={() => setInspectModel(m)} className="flex-1 text-left font-semibold hover:text-[var(--accent)] transition-colors truncate">
                    {m.display_name}
                  </button>
                  <span className={`badge ${originClass(m)}`}>{m.origin}</span>
                  <span className="font-mono text-sm text-[var(--text)] whitespace-nowrap">
                    {co2.mid} <span className="text-[var(--text-muted)] font-normal">{co2.unit}</span>
                  </span>
                </li>
              );
            })}
          </ol>
          <p className="text-[11px] text-[var(--text-muted)] mt-3">{tt.rankBiggestUnit}</p>
        </section>
      </div>

      {/* Full interactive table */}
      <section className="card p-6">
        <div className="mb-4">
          <h2 className="font-bold">{tt.rankFullTitle}</h2>
          <p className="text-xs text-[var(--text-muted)]">{tt.tableSubtitle}</p>
        </div>
        <ModelsTable models={data.models} lang={lang} onInspect={setInspectModel} />
      </section>
    </div>
  );
}
