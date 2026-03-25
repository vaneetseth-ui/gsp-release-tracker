import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';

/**
 * Notify team via server Glip webhook (v1.2). Falls back to disabled state if endpoint errors.
 */
export default function GlipNotifyButton({ variant = 'card', context = {} }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const handleClick = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/glip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: variant === 'ask' ? 'report_problem' : 'notify_card', ...context }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setMsg('Sent');
      setTimeout(() => setMsg(null), 2500);
    } catch (e) {
      setMsg(e.message || 'Failed');
      setTimeout(() => setMsg(null), 4000);
    } finally {
      setBusy(false);
    }
  };

  const label = variant === 'ask' ? 'Report a problem' : 'Notify team';

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-50 ring-1 ring-sky-500/30"
      >
        <MessageCircle size={14} strokeWidth={2.5} />
        {busy ? 'Sending…' : label}
      </button>
      {msg && <span className="text-xs text-slate-500 dark:text-slate-400">{msg}</span>}
    </div>
  );
}
