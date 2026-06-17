import React from 'react';
import type { Lang } from '../lib/i18n';
import { useI18n } from '../lib/i18n';

export type AccountingMethod = 'location' | 'market';

interface Props {
  method: AccountingMethod;
  onChange: (method: AccountingMethod) => void;
  lang: Lang;
}

export const AccountingToggle: React.FC<Props> = ({ method, onChange, lang }) => {
  const tt = useI18n(lang);
  return (
    <div className="inline-flex rounded-lg overflow-hidden border border-[var(--border)] text-xs font-medium bg-[var(--bg)]">
      <button
        onClick={() => onChange('location')}
        className={`px-3.5 py-1 transition ${method === 'location' ? 'bg-[var(--accent)] text-[var(--bg)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elev)]'}`}
        title={tt.locationHint}
      >
        {tt.locationBased}
      </button>
      <button
        onClick={() => onChange('market')}
        className={`px-3.5 py-1 transition border-l border-[var(--border)] ${method === 'market' ? 'bg-[var(--accent)] text-[var(--bg)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elev)]'}`}
        title={tt.marketHint}
      >
        {tt.marketBased}
      </button>
    </div>
  );
};
