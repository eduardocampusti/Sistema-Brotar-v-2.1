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
}> = ({ value, onChange, type = 'text', placeholder, disabled }) => (
  <input
    type={type}
    value={value}
    disabled={disabled}
    placeholder={placeholder}
    onChange={(e) => onChange(e.target.value)}
    className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-200 disabled:bg-slate-100"
  />
);

export const PpTextarea: React.FC<{
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  minHeightClass?: string;
}> = ({ value, onChange, rows = 3, placeholder, minHeightClass = 'min-h-[88px]' }) => (
  <textarea
    value={value}
    rows={rows}
    placeholder={placeholder}
    onChange={(e) => onChange(e.target.value)}
    className={`w-full rounded-xl bg-white border border-slate-200 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-200 resize-y ${minHeightClass}`}
  />
);

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
            value === k ? 'bg-pink-600 text-white shadow' : 'bg-white text-slate-500 border border-slate-200 hover:border-pink-200'
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
        className={`flex-1 px-2 py-2 rounded-lg text-xs font-bold ${value === true ? 'bg-pink-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
      >
        Sim
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`flex-1 px-2 py-2 rounded-lg text-xs font-bold ${value === false ? 'bg-slate-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
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
  <div className="bg-slate-200/80 rounded-2xl border border-slate-300/80 shadow-sm overflow-hidden mb-6">
    <div className="px-4 py-3 bg-slate-300/60 border-b border-slate-300">
      <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">{title}</h4>
    </div>
    <div className="p-4 md:p-6 space-y-4">{children}</div>
  </div>
);
