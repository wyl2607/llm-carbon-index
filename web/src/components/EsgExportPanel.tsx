import React from 'react';
import { Download } from 'lucide-react';
import type { LatestData } from '../types';
import {
  buildEsgExport,
  downloadEsgJson,
  downloadEsgCsv,
  SCOPE_CAVEAT,
} from '../lib/esgExport';

interface Props {
  data: LatestData | null;
}

/**
 * EsgExportPanel — P7 download surface for CSRD/ESRS audiences.
 * Renders the non-removable project scope/uncertainty caveat.
 * Buttons trigger client-side construction from the live latest.json
 * and immediate download of JSON or CSV containing the caveat + dual Scope-2 numbers.
 * The caveat string is present verbatim inside every produced artifact.
 */
export const EsgExportPanel: React.FC<Props> = ({ data }) => {
  if (!data || !data.totals) {
    return null;
  }

  const handleDownload = (format: 'json' | 'csv') => {
    try {
      const esg = buildEsgExport(data);
      if (format === 'json') {
        downloadEsgJson(esg);
      } else {
        downloadEsgCsv(esg);
      }
    } catch {
      // silent; build already guards
    }
  };

  return (
    <div
      role="region"
      aria-label="ESG CSRD Scope-2 dual reporting export"
      className="card p-4 text-sm border border-[#242924] bg-[#0a0c0a]"
    >
      <div className="uppercase tracking-[1px] text-[#9ba19b] text-xs font-bold mb-2 flex items-center gap-2">
        <span>📊</span> ESG / CSRD Scope-2 Dual Reporting Export
      </div>

      <p className="text-[#c7c9c3] leading-snug mb-2">
        {SCOPE_CAVEAT}
      </p>
      <p className="text-[11px] text-[#8a8f87] mb-3">
        The scope &amp; uncertainty statement above is embedded in every downloaded file and cannot be removed.
        Location-based uses physical grid intensity; market-based reflects contractual instruments (GHG Protocol Scope 2).
        Figures are taken directly from totals.co2_kg / co2_kg_market (no new values created).
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => handleDownload('json')}
          className="btn btn-secondary text-sm inline-flex items-center gap-1.5"
          aria-label="Download ESG export as JSON"
        >
          <Download className="w-4 h-4" /> JSON (Scope-2 + ESRS-E1)
        </button>
        <button
          type="button"
          onClick={() => handleDownload('csv')}
          className="btn btn-secondary text-sm inline-flex items-center gap-1.5"
          aria-label="Download ESG export as CSV"
        >
          <Download className="w-4 h-4" /> CSV (Scope-2 + ESRS-E1)
        </button>
      </div>

      <div className="mt-2 text-[10px] text-[#6f756f]">
        Suitable for CSRD/ESRS E1 disclosure workbooks. Scale by modeled_traffic_fraction for your actual usage share.
        Always retain the embedded caveat when using in reports.
      </div>
    </div>
  );
};

export default EsgExportPanel;
