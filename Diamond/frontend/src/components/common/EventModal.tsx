'use client';
import { useEffect } from 'react';
import type { DiamondEvent, Intent } from '@/types/event';
import { verdictOf } from '@/utils/filterUtils';
import { jsonDiff } from '@/utils/jsonDiff';
import { useTranslation } from '@/i18n/useTranslation';

const LABEL: Record<string, string> = { observed: 'Observed', flagged: 'Flagged', pending: 'Pending approval', denied_sim: 'Denied (simulated)', denied_supervisor: 'Denied by supervisor', denied_kernel: 'Denied by kernel' };

export default function EventModal({ event, prev, intent, onClose }: { event: DiamondEvent; prev?: DiamondEvent; intent: Intent; onClose: () => void }) {
  const { t } = useTranslation();
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  const lines = prev ? jsonDiff(prev, event) : [];
  return (
    <div role="dialog" aria-modal="true" aria-label={`Event ${event.id}`} className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center" onClick={onClose}>
      <div className="bg-deep border border-white/10 w-[640px] max-w-[94vw] max-h-[88vh] overflow-auto p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-sm tracking-widest uppercase text-t3">Event {event.id}</h2>
          {event.sim && <span className="text-[10px] px-1.5 bg-accent text-white font-mono uppercase">{t('sim.badge')}</span>}
          <button className="ml-auto text-t2" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <dl className="grid grid-cols-[110px_1fr] gap-y-1 text-sm">
          {([['Operation', `${event.cat} · ${event.op}`], ['Resource', event.res ?? '—'], ['PID', String(event.pid)], ['Time', `${(event.t / 1000).toFixed(2)} s`],
            ['Status', LABEL[event.status] ?? event.status], ['Verdict', verdictOf(event, intent)], ['Provenance', event.sim ? 'Simulated demo scenario' : 'Backend telemetry'],
            ['Evidence', event.evidence ?? 'None supplied'], ['Explanation', event.note ?? '—']] as [string, string][]).map(([k, v]) => (
            <div key={k} className="contents"><dt className="text-t3">{k}</dt><dd className="font-mono text-[12px] break-all">{v}</dd></div>))}
        </dl>
        {lines.length > 0 && <>
          <h3 className="mt-4 mb-1 text-xs uppercase tracking-widest text-t3">Change vs previous event</h3>
          <pre className="text-[11px] font-mono bg-s1 p-2 overflow-auto">{lines.map((l, i) => <div key={i} className={l.kind === 'add' ? 'text-ok' : l.kind === 'del' ? 'text-accent' : 'text-t3'}>{l.kind === 'add' ? '+ ' : l.kind === 'del' ? '- ' : '  '}{l.text}</div>)}</pre>
        </>}
        {event.status === 'denied_sim' && <p className="mt-3 text-xs text-t3">Simulated outcome. Not a kernel enforcement.</p>}
      </div>
    </div>
  );
}
