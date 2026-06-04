import React from 'react';

export const PpFieldLabel: React.FC<{ children: React.ReactNode; hint?: string }> = ({ children, hint }) => (
  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide mb-1.5 ml-0.5">
    {children}
    {hint ? <span className="block normal-case text-[10px] font-medium text-slate-400 mt-0.5">{hint}</span> : null}
  </label>
);

export const PpInput: React.FC<{
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
}> = ({ value, onChange, type = 'text', placeholder, disabled }) => {
  const filled = value && value.trim() !== '';
  return (
    <input
      type={type}
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none transition-all disabled:bg-slate-100
        ${filled
          ? 'bg-[#EAF3DE] border border-[#97C459] text-[#27500A] focus:border-[#8B1A3A] focus:bg-[#fdf8f9] focus:ring-1 focus:ring-[#8B1A3A]/20'
          : 'bg-white border border-slate-200 focus:border-[#8B1A3A] focus:ring-1 focus:ring-[#8B1A3A]/20 focus:bg-[#fdf8f9]'
        }`}
    />
  );
};

export const PpTextarea: React.FC<{
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  minHeightClass?: string;
}> = ({ value, onChange, rows = 3, placeholder, minHeightClass = 'min-h-[88px]' }) => {
  const filled = value && value.trim() !== '';
  return (
    <textarea
      value={value}
      rows={rows}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none transition-all resize-y ${minHeightClass}
        ${filled
          ? 'bg-[#EAF3DE] border border-[#97C459] text-[#27500A] focus:border-[#8B1A3A] focus:bg-[#fdf8f9] focus:ring-1 focus:ring-[#8B1A3A]/20'
          : 'bg-white border border-slate-200 focus:border-[#8B1A3A] focus:ring-1 focus:ring-[#8B1A3A]/20 focus:bg-[#fdf8f9]'
        }`}
    />
  );
};

export const PpTriState: React.FC<{
  label: string;
  value: boolean | null;
  onChange: (v: boolean | null) => void;
}> = ({ label, value, onChange }) => (
  <div className="flex flex-col gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{label}</span>
    <div className="flex gap-1.5">
      {(
        [
          { k: true, t: 'Sim' },
          { k: false, t: 'Não' },
          { k: null, t: '—' },
        ] as const
      ).map(({ k, t }) => (
        <button
          key={String(k)}
          type="button"
          onClick={() => onChange(k)}
          className={`flex-1 px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
            value === k ? 'bg-[#8B1A3A] text-white shadow' : 'bg-white text-slate-500 border border-slate-200 hover:border-[#8B1A3A]/30'
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  </div>
);

export const PpYesNo: React.FC<{
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, value, onChange }) => (
  <div className="flex flex-col gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{label}</span>
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`flex-1 px-2 py-2 rounded-lg text-xs font-bold transition-all ${value === true ? 'bg-[#8B1A3A] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-[#8B1A3A]/30'}`}
      >
        Sim
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`flex-1 px-2 py-2 rounded-lg text-xs font-bold transition-all ${value === false ? 'bg-slate-700 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400'}`}
      >
        Não
      </button>
    </div>
  </div>
);

export const PpCheckboxRow: React.FC<{
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-slate-700 py-1">
    <input type="checkbox" className="rounded border-slate-300 text-pink-600 focus:ring-pink-500" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    <span>{label}</span>
  </label>
);

export const PpSectionShell: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="rounded-xl border border-slate-200 overflow-hidden mb-5">
    <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{title}</h4>
    </div>
    <div className="p-4 space-y-4 bg-white">{children}</div>
  </div>
);
