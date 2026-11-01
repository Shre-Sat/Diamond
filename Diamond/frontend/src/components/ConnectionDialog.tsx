'use client';
import { useState, type ReactNode } from 'react';
import { DEFAULT_LOCAL, useSnapshot, type Conn, type Mode } from '@/lib/connection';
import type { DiamondSnapshot } from '@/types/event';
import { useTranslation } from '@/i18n/useTranslation';
import NodeManager from './NodeManager';

export default function ConnectionDialog({ onConnect }: { onConnect: (c: Conn) => void }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>('demo');
  const [url, setUrl] = useState(DEFAULT_LOCAL.url);
  const [token, setToken] = useState('');
  const opts: [Mode, string][] = [['local', t('conn.local')], ['cloud', t('conn.cloud')], ['demo', t('conn.demo')]];
  return (
    <div role="dialog" aria-label={t('conn.title')} className="max-w-md mx-auto mt-16 border border-white/10 bg-deep p-5 space-y-3">
      <h1 className="text-lg">{t('conn.title')}</h1>
      <div className="space-y-1">{opts.map(([m, l]) => <label key={m} className="flex gap-2 text-sm"><input type="radio" name="mode" checked={mode === m} onChange={() => setMode(m)} />{l}</label>)}</div>
      {mode !== 'demo' && <>
        <input aria-label="Daemon URL" value={url} onChange={e => setUrl(e.target.value)} className="w-full bg-s1 border border-white/10 px-2 py-1 font-mono text-sm" />
        {mode === 'cloud' && <input aria-label="Token" type="password" placeholder="Pairing token" value={token} onChange={e => setToken(e.target.value)} className="w-full bg-s1 border border-white/10 px-2 py-1 text-sm" />}</>}
      <button onClick={() => onConnect({ mode, url: mode === 'demo' ? '' : url, token: token || undefined })} className="bg-accent text-white px-4 py-1.5 text-sm">{t('conn.connect')}</button>
    </div>
  );
}
/** Wraps a page: asks for a connection first, then renders children with the live snapshot. */
export function ConnectionGate({ children }: { children: (snap: DiamondSnapshot) => ReactNode }) {
  const { conn, setConn, snap, status } = useSnapshot();
  const { t } = useTranslation();
  if (!conn) return <ConnectionDialog onConnect={setConn} />;
  return (
    <div>
      <NodeManager conn={conn} status={status} onDisconnect={() => setConn(null)} />
      {snap ? children(snap) : <p className="text-t3">{status === 'offline' ? t('status.offline') : t('status.connecting')}…</p>}
    </div>
  );
}
