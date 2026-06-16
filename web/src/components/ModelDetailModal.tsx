import React from 'react';
import type { Model } from '../types';
import { formatCO2Range, formatWaterRange, co2Per1kOutputTokens, formatCO2Per1kG } from '../lib/format';
import { X } from 'lucide-react';

interface Props {
  model: Model | null;
  onClose: () => void;
}

export const ModelDetailModal: React.FC<Props> = ({ model, onClose }) => {
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
            <div className="text-xs text-[#a1a6a1] mt-0.5 font-mono">{model.slug}</div>
          </div>
          <button onClick={onClose} className="text-[#9ba19b] hover:text-white p-1" aria-label="Close"><X size={18} /></button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
          <div>
            <div className="text-[#9ba19b] text-xs uppercase tracking-widest">CO₂ (mid + range)</div>
            <div className="font-mono text-xl font-semibold mt-0.5">{formatCO2Range(model.co2_kg)}</div>
          </div>
          <div>
            <div className="text-[#9ba19b] text-xs uppercase tracking-widest">Water</div>
            <div className="font-mono text-xl font-semibold mt-0.5">{formatWaterRange(model.water_liters)}</div>
          </div>

          <div>
            <div className="text-[#9ba19b] text-xs uppercase tracking-widest">Efficiency</div>
            <div className="font-mono mt-0.5">{formatCO2Per1kG(eff)}</div>
          </div>
          <div>
            <div className="text-[#9ba19b] text-xs uppercase tracking-widest">Origin / Type</div>
            <div className="mt-0.5">{model.origin} · {model.open_or_closed}</div>
          </div>

          <div>
            <div className="text-[#9ba19b] text-xs uppercase tracking-widest">Energy per output token (Wh)</div>
            <div className="font-mono">low {model.wh_per_output_token.low} · mid {model.wh_per_output_token.mid} · high {model.wh_per_output_token.high}</div>
          </div>
          <div>
            <div className="text-[#9ba19b] text-xs uppercase tracking-widest">PUE × Grid (gCO₂/kWh)</div>
            <div className="font-mono">{model.pue} × {model.carbon_intensity_gco2_kwh}</div>
          </div>
        </div>

        <div className="mt-5 p-4 rounded-xl bg-black/40 border border-white/5 text-sm">
          <div className="font-semibold text-emerald-400 mb-2">Architectural & Hardware Proxies</div>
          <div className="text-gray-300 text-xs space-y-2">
            <p><strong>Hardware Assumption:</strong> Inference emissions model assumes standardized accelerator hardware (e.g., 8x H100 SXM for 70B+ parameter class models).</p>
            <p><strong>Power Usage Effectiveness (PUE):</strong> Assumed constant at <strong>{model.pue}</strong>, based on reported regional data center averages.</p>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-[#242924] text-xs text-[#a1a6a1]">
          <div className="font-semibold text-[#e4e7e4] mb-1">Energy source:</div> {model.energy_source}<br/>
          <div className="font-semibold text-[#e4e7e4] mt-2 mb-1">Grid source:</div> {model.grid_source} ({model.region})<br/>
          {model.renewable_match_pct != null && <div className="mt-1">Renewable match: {model.renewable_match_pct}%</div>}
        </div>

        {model.flags.length > 0 && (
          <div className="mt-4">
            <div className="uppercase text-xs tracking-widest text-amber-400 mb-1">Flags</div>
            <div className="flex flex-wrap gap-1">
              {model.flags.map(f => (
                <span key={f} className="badge text-amber-300/90 border-amber-800/50 bg-amber-900/20 text-[10px]">{f}</span>
              ))}
            </div>
            <p className="text-[11px] text-[#9ba19b] mt-2">FALLBACK flags indicate conservative parameter-class or annual grid assumptions. See methodology for full sensitivity.</p>
          </div>
        )}

        <div className="mt-6 text-right">
          <button onClick={onClose} className="btn btn-secondary text-xs">Close</button>
        </div>
      </div>
    </div>
  );
};
