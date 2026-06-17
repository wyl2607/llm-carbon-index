import React from 'react';
import type { Totals, Range } from '../types';
import type { Lang } from '../lib/i18n';
import { useI18n } from '../lib/i18n';
import { useAnimatedNumber } from '../lib/useAnimatedNumber';
import { nf } from '../lib/format';
import { Cpu, Cloud, Zap, TrendingDown } from 'lucide-react';

interface Props {
  totals: Totals;
  baselineCo2?: Range;
  shift?: number;
  lang: Lang;
  modeledFraction?: number;
}

export const KpiCards: React.FC<Props> = ({ totals, shift = 0, lang, modeledFraction = 0 }) => {
  const tt = useI18n(lang);

  // 1. Total Estimated Emissions (tCO2e)
  const co2MidTons = totals.co2_kg.mid / 1000;
  const co2LowTons = totals.co2_kg.low / 1000;
  const co2HighTons = totals.co2_kg.high / 1000;
  
  // 2. Aggregate Inference Volume (Billions)
  const tokensB = totals.total_tokens / 1e9;
  
  // 3. Weighted Carbon Intensity (gCO2e / 1k Tokens)
  const avgGCo2e1k = totals.total_tokens > 0 
    ? ((totals.co2_kg.mid * 1000) / (totals.total_tokens / 1000)).toFixed(1)
    : '0.0';

  // 4. Substitution Potential (Max scenario)
  // Logic: if 100% shifted to 50g grid, what % is avoided?
  const maxPotential = modeledFraction > 0 ? (modeledFraction * 42).toFixed(1) : '0.0';

  const isActive = shift > 0;

  const animatedCo2 = useAnimatedNumber(co2MidTons, 650);
  const animatedTokens = useAnimatedNumber(tokensB, 650);
  const animatedIntensity = useAnimatedNumber(parseFloat(avgGCo2e1k) || 0, 650);
  const animatedPotential = useAnimatedNumber(parseFloat(maxPotential) || 0, 650);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const KPICard = ({ title, sub, midValue, low, high, unit, icon: Icon, highlight = false }: any) => (
    <div className={`relative overflow-hidden rounded-2xl border ${highlight ? 'border-[var(--accent-border)]' : 'border-[var(--border)]'} bg-[var(--bg-elev)]/60 p-6 backdrop-blur-md shadow-2xl transition-all hover:border-[var(--accent-border)] group`}>
      <div className={`flex items-center justify-between text-xs font-bold uppercase tracking-widest ${highlight ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}`}>
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${highlight ? 'text-[var(--accent)]' : 'text-[var(--accent)]/60 group-hover:text-[var(--accent)]'} transition-colors`} /> 
          {title}
        </div>
        {highlight && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent-bg)] text-[var(--accent)] border border-[var(--accent-border)] font-black">SCENARIO</span>}
      </div>
      <div className="mt-4 flex items-baseline gap-2">
        <span className={`text-4xl sm:text-5xl font-black tracking-tight tabular-nums ${highlight ? 'text-[var(--accent)]' : 'text-[var(--text)]'}`}>
          {nf(midValue, { minimumFractionDigits: highlight ? 1 : 1, maximumFractionDigits: 1 })}
        </span>
        {unit && <span className={`text-xl font-bold ${highlight ? 'text-[var(--accent)]/80' : 'text-[var(--text-muted)]'}`}>{unit}</span>}
      </div>
      {(low !== undefined && high !== undefined && low !== 0 && high !== 0) ? (
        <div className="mt-2 text-xs text-[var(--text-muted)] font-mono flex items-center gap-1.5">
          <span className="opacity-60">{tt.kpiRange}</span> 
          <span className="text-[var(--text-secondary)]">{nf(low, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
          <span className="opacity-30">—</span>
          <span className="text-[var(--text-secondary)]">{nf(high, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
          <span className="opacity-60">{unit || 't'}</span>
        </div>
      ) : (
        <div className="h-6" /> 
      )}
      <div className="mt-5 text-[11px] text-[var(--text-muted)] border-t border-[var(--border)]/50 pt-3 leading-relaxed">{sub}</div>
      
      {/* Decorative inner glow (amber phosphor) */}
      <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-[var(--accent-bg)] rounded-full blur-2xl group-hover:bg-[var(--accent-bg)] transition-all" />
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <KPICard 
        title={tt.kpiCo2}
        sub={tt.kpiCo2Sub}
        midValue={animatedCo2}
        low={co2LowTons}
        high={co2HighTons}
        unit="t"
        icon={Cloud}
        highlight={isActive}
      />
      
      <KPICard 
        title={tt.kpiTokens}
        sub={tt.kpiTokensSub}
        midValue={animatedTokens}
        unit="B"
        icon={Cpu}
      />
      
      <KPICard 
        title={tt.kpiIntensity}
        sub={tt.kpiIntensitySub}
        midValue={animatedIntensity}
        unit="g"
        icon={Zap}
      />
      
      <KPICard 
        title="Substitution Potential"
        sub="Maximum daily emissions movable to low-carbon regions."
        midValue={animatedPotential}
        unit="%"
        icon={TrendingDown}
        highlight={true}
      />
    </div>
  );
};
