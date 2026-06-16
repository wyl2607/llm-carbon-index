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
    <div className="inline-flex rounded-lg overflow-hidden border border-[#242924] text-xs font-medium bg-[#0a0c0a]">
      <button
        onClick={() => onChange('location')}
        className={`px-3.5 py-1 transition ${method === 'location' ? 'bg-white text-black' : 'text-[#a1a6a1] hover:bg-[#151915]'}`}
        title={tt.locationHint}
      >
        {tt.locationBased}
      </button>
      <button
        onClick={() => onChange('market')}
        className={`px-3.5 py-1 transition border-l border-[#242924] ${method === 'market' ? 'bg-white text-black' : 'text-[#a1a6a1] hover:bg-[#151915]'}`}
        title={tt.marketHint}
      >
        {tt.marketBased}
      </button>
    </div>
  );
};
