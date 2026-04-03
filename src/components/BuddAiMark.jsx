import React from 'react';

export default function BuddAiMark({ className = '', compact = false, dark = false }) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl shadow-sm ${dark ? 'bg-white/12 ring-1 ring-white/15' : 'bg-[#0a0e27] ring-1 ring-slate-200/70'}`}>
        <svg
          viewBox="0 0 48 48"
          className="h-8 w-8"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle cx="24" cy="24" r="15" stroke="#0EA5C6" strokeWidth="2.5" />
          <circle cx="24" cy="24" r="4.5" stroke="#0EA5C6" strokeWidth="2.5" />
          <circle cx="16" cy="16" r="2.5" fill="#EA580C" />
          <circle cx="32" cy="16" r="2.5" fill="#EA580C" />
          <circle cx="16" cy="32" r="2.5" fill="#EA580C" />
          <circle cx="32" cy="32" r="2.5" fill="#EA580C" />
          <path d="M24 9V14" stroke="#0EA5C6" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M24 34V39" stroke="#0EA5C6" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M9 24H14" stroke="#0EA5C6" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M34 24H39" stroke="#0EA5C6" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M18.5 18.5L21 21" stroke="#0EA5C6" strokeWidth="2" strokeLinecap="round" />
          <path d="M29.5 18.5L27 21" stroke="#0EA5C6" strokeWidth="2" strokeLinecap="round" />
          <path d="M18.5 29.5L21 27" stroke="#0EA5C6" strokeWidth="2" strokeLinecap="round" />
          <path d="M29.5 29.5L27 27" stroke="#0EA5C6" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      {!compact && (
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            Powered By
          </p>
          <div className="flex items-baseline gap-1">
            <span className="font-display text-xl font-bold tracking-tight text-slate-950">PMO</span>
            <span className="font-display text-xl font-bold tracking-tight text-cyan-600">BuddAI</span>
          </div>
        </div>
      )}
    </div>
  );
}
