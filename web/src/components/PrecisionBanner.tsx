import React from 'react';
import type { Precision } from '../types';
import type { Lang } from '../lib/i18n';
import { useI18n } from '../lib/i18n';

interface Props {
  precision?: Precision;
  lang?: Lang;
}

/**
 * PrecisionBanner — Phase 6F estimation-tier honesty.
 * Always visible, non-dismissable, surfaced next to the scope banner (never buried
 * on the methodology page). Reports the token-weighted measured-vs-fallback fractions
 * already implied by per-row energy_source / grid_source flags — no new sourced numbers.
 */
export const PrecisionBanner: React.FC<Props> = ({ precision, lang = 'en' }) => {
  const tt = useI18n(lang);
  if (!precision) return null;

  const energyPct = (precision.energy_measured_fraction * 100).toFixed(0);
  const gridPct = (precision.grid_live_fraction * 100).toFixed(0);
  const allFallback =
    precision.energy_measured_fraction === 0 && precision.grid_live_fraction === 0;

  return (
    <div
      role="note"
      aria-label="Estimation precision note"
      className="card p-4 text-sm border-[var(--border)] bg-[var(--bg-elev)]"
    >
      <div className="uppercase tracking-[1px] text-[var(--text-secondary)] text-xs font-bold flex items-center gap-2 mb-1.5 label-sm">
        <span>◷</span> {tt.precisionTitle}
      </div>
      <p className="text-[var(--text-secondary)] leading-snug font-medium">
        {tt.precisionHeadline(energyPct, gridPct)}
      </p>
      <p className="text-[12px] text-[var(--text-muted)] mt-1.5 border-l-2 border-[var(--border-strong)] pl-2.5">
        {allFallback
          ? tt.precisionAllFallback
          : tt.precisionDetail(
              precision.models_measured,
              precision.models_total,
              precision.grid_live_models,
            )}
      </p>
    </div>
  );
};
