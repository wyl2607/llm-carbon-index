import React from 'react';
import { Download } from 'lucide-react';
import type { LatestData } from '../types';
import type { Lang } from '../lib/i18n';
import { useI18n } from '../lib/i18n';
import {
  buildEsgExport,
  downloadEsgJson,
  downloadEsgCsv,
  SCOPE_CAVEAT,
} from '../lib/esgExport';

interface Props {
  data: LatestData | null;
  lang?: Lang;
}

/**
 * EsgExportPanel — P7 download surface for CSRD/ESRS audiences.
 * Renders the non-removable project scope/uncertainty caveat.
 * Buttons trigger client-side construction from the live latest.json
 * and immediate download of JSON or CSV containing the caveat + dual Scope-2 numbers.
 * The caveat string is present verbatim inside every produced artifact.
 */
export const EsgExportPanel: React.FC<Props> = ({ data, lang = 'en' }) => {
  const tt = useI18n(lang);
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
      className="card p-4 text-sm border border-[var(--border)] bg-[var(--bg)]"
    >
      <div className="uppercase tracking-[1px] text-[var(--text-muted)] text-xs font-bold mb-2 flex items-center gap-2 label-sm">
        <span>📊</span> {tt.esgTitle}
      </div>

      <p className="text-[var(--text-secondary)] leading-snug mb-2">
        {SCOPE_CAVEAT}
      </p>
      <p className="text-[11px] text-[var(--text-muted)] mb-3">
        {tt.esgCaveatNote}
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
        {tt.esgFooter}
      </div>
    </div>
  );
};

export default EsgExportPanel;
