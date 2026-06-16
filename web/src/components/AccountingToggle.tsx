import React from 'react';

export type AccountingMethod = 'location' | 'market';

interface Props {
  method: AccountingMethod;
  onChange: (method: AccountingMethod) => void;
}

export const AccountingToggle: React.FC<Props> = ({ method, onChange }) => {
  return (
    <div className="inline-flex rounded-lg overflow-hidden border border-[#242924] text-xs font-medium bg-[#0a0c0a]">
      <button
        onClick={() => onChange('location')}
        className={`px-3.5 py-1 transition ${method === 'location' ? 'bg-white text-black' : 'text-[#a1a6a1] hover:bg-[#151915]'}`}
        title="Physical grid emissions (location of inference)"
      >
        Location
      </button>
      <button
        onClick={() => onChange('market')}
        className={`px-3.5 py-1 transition border-l border-[#242924] ${method === 'market' ? 'bg-white text-black' : 'text-[#a1a6a1] hover:bg-[#151915]'}`}
        title="Market-based (incl. RECs / PPAs)"
      >
        Market
      </button>
    </div>
  );
};
