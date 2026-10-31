'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { short } from '@/lib/poa/crypto';
import type { Decision, RunStatus, StepRecord } from '@/lib/poa/types';

export const DecisionTag = ({ d }: { d: Decision }) => <span className={'tag ' + d}>{d}</span>;
export const RuleChip = ({ id }: { id: string | null }) => (id ? <span className="m rule">{id}</span> : null);
export const LabelChips = ({ labels }: { labels: string[] }) => <>{labels.length ? labels.map(l => <span key={l} className="tag lbl">{l}</span>) : <span className="mut">none</span>}</>;
export const HashChip = ({ h, n = 12, title }: { h: string | null; n?: number; title?: string }) => <span className="m hash" title={title ?? h ?? ''}>{short(h, n)}</span>;
export const statusLabel: Record<RunStatus, string> = { running: 'running', proving: 'proving', verified: 'verified', 'violated-blocked': 'violated-blocked' };
export const StatusTag = ({ s }: { s: RunStatus }) => <span className={'tag st-' + s}>{statusLabel[s]}</span>;
export const Empty = ({ children }: { children: ReactNode }) => <div className="empty">{children}</div>;
/** Public view of an amount: bucketed, never the exact value (PRD §11.4). */
export const bucket = (n: number | null) => (n == null ? '—' : n > 50000 ? '>50k' : n > 10000 ? '10k–50k' : '≤10k');
export const featureLine = (s: StepRecord) => [s.args_features.amount != null && 'amount ' + bucket(s.args_features.amount), s.args_features.sink && 'sink ' + s.args_features.sink, s.args_features.from_session != null && (s.args_features.from_session ? 'from session account' : 'from other account')].filter(Boolean).join(' · ') || '—';
export const fmtTime = (unix: number) => new Date(unix * 1000).toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

export function Qr({ text, size = 132 }: { text: string; size?: number }) {
  const [svg, setSvg] = useState('');
  useEffect(() => {
    let dead = false;
    import('qrcode').then(Q => Q.toString(text, { type: 'svg', margin: 1, width: size, color: { dark: '#F4F2EF', light: '#202020' } })).then(s => { if (!dead) setSvg(s); }).catch(() => { if (!dead) setSvg(''); });
    return () => { dead = true; };
  }, [text, size]);
  return svg ? <div className="qr" role="img" aria-label="QR code linking to the verifier for this run" dangerouslySetInnerHTML={{ __html: svg }} /> : <div className="qr mut">QR unavailable</div>;
}

export function downloadJson(name: string, data: unknown) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
