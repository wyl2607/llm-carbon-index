import React from 'react';
import type { Model } from '../types';
import { useI18n, type Lang } from '../lib/i18n';
import { formatCO2Range, formatWaterRange, co2Per1kOutputTokens, formatCO2Per1kG } from '../lib/format';
import { X } from 'lucide-react';

interface Props {
  model: Model | null;
  onClose: () => void;
}

export const ModelDetailModal: React.FC<Props & {lang?: Lang}> = ({ model, onClose, lang = 'en' }) => {
  const tt = useI18n(lang);
  if (!model) return null;

  const eff = co2Per1kOutputTokens(model);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div 
        className="card w-full max-w-lg p-6 text-left" 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start">
          <div>
            <div className="font-bold text-lg tracking-tight">{model.display_name}</div>
            <div className="text-xs text-[var(--text-secondary)] mt-0.5 font-mono">{model.slug}</div>
          </div>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text)] p-1" aria-label="Close"><X size={18} /></button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
          <div>
            <div className="text-[var(--text-muted)] text-xs uppercase tracking-widest">CO₂ (mid + range)</div>
            <div className="font-mono text-xl font-semibold mt-0.5">{formatCO2Range(model.co2_kg)}</div>
          </div>
          <div>
            <div className="text-[var(--text-muted)] text-xs uppercase tracking-widest">{tt.modalWater}</div>
            <div className="font-mono text-xl font-semibold mt-0.5">{formatWaterRange(model.water_liters)}</div>
          </div>

          <div>
            <div className="text-[var(--text-muted)] text-xs uppercase tracking-widest">{tt.modalEff}</div>
            <div className="font-mono mt-0.5">{formatCO2Per1kG(eff)}</div>
          </div>
          <div>
            <div className="text-[var(--text-muted)] text-xs uppercase tracking-widest">{tt.modalOrigin}</div>
            <div className="mt-0.5">{model.origin} · {model.open_or_closed}</div>
          </div>

          <div>
            <div className="text-[var(--text-muted)] text-xs uppercase tracking-widest">{tt.modalEnergy}</div>
            <div className="font-mono">low {model.wh_per_output_token.low} · mid {model.wh_per_output_token.mid} · high {model.wh_per_output_token.high}</div>
          </div>
          <div>
            <div className="text-[var(--text-muted)] text-xs uppercase tracking-widest">PUE × Grid (gCO₂/kWh)</div>
            <div className="font-mono">{model.pue} × {model.carbon_intensity_gco2_kwh}</div>
          </div>
        </div>

        <div className="mt-5 p-4 rounded-xl bg-[var(--bg-elev)] border border-[var(--border)] text-sm">
          <div className="font-semibold text-[var(--accent)] mb-2">{tt.modalArch}</div>
          <div className="text-[var(--text-secondary)] text-xs space-y-2">
            <p><strong>{tt.modalHardwareTitle}</strong> {tt.modalHardwareBody}</p>
            <p><strong>{tt.modalPueTitle}</strong> {tt.modalPueBody(model.pue)}</p>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-[var(--border)] text-xs text-[var(--text-secondary)]">
          <div className="font-semibold text-[var(--text)] mb-1">{tt.modalEnergySrc}</div> {model.energy_source}<br/>
          <div className="font-semibold text-[var(--text)] mt-2 mb-1">{tt.modalGridSrc}</div> {model.grid_source} ({model.region})<br/>
          {model.renewable_match_pct != null && <div className="mt-1">{tt.modalRenewable} {model.renewable_match_pct}%</div>}
        </div>

        {model.flags.length > 0 && (
          <div className="mt-4">
            <div className="uppercase text-xs tracking-widest text-[var(--accent)] mb-1">{tt.modalFlags}</div>
            <div className="flex flex-wrap gap-1">
              {model.flags.map(f => (
                <span key={f} className="badge">{f}</span>
              ))}
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-2">{tt.modalFallbackNote}</p>
          </div>
        )}

        <div className="mt-6 text-right">
          <button onClick={onClose} className="btn btn-secondary text-xs">{tt.close}</button>
        </div>
      </div>
    </div>
  );
};
