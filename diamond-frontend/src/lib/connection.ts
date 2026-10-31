'use client';
import { useCallback, useEffect, useState } from 'react';
import type { DiamondSnapshot } from '@/types/event';
import { mergeEvent, normalizeSnapshot } from '@/utils/sessionData';
import { fetchSnapshot, openStream } from './nodeClient';

export type Mode = 'local' | 'cloud' | 'demo';
export interface Conn { mode: Mode; url: string; token?: string }
export type Status = 'idle' | 'connecting' | 'live' | 'offline';
const KEY = 'diamond.conn';
export const DEFAULT_LOCAL: Conn = { mode: 'local', url: 'http://localhost:7777' };

export const loadConn = (): Conn | null => {
  try { const s = localStorage.getItem(KEY); return s ? (JSON.parse(s) as Conn) : null; } catch { return null; }
};
export const saveConn = (c: Conn | null) => { if (c) localStorage.setItem(KEY, JSON.stringify(c)); else localStorage.removeItem(KEY); };

/** Loads the snapshot for the saved connection and keeps it live over WebSocket (or demo JSON). */
export function useSnapshot() {
  const [conn, setConnState] = useState<Conn | null>(null);
  const [snap, setSnap] = useState<DiamondSnapshot | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  useEffect(() => { setConnState(loadConn()); }, []);
  const setConn = useCallback((c: Conn | null) => { saveConn(c); setConnState(c); setSnap(null); }, []);
  useEffect(() => {
    if (!conn) { setStatus('idle'); return; }
    let close = () => {}; let dead = false; setStatus('connecting');
    fetchSnapshot(conn).then(s => {
      if (dead) return; setSnap(normalizeSnapshot(s));
      if (conn.mode === 'demo') { setStatus('live'); return; }
      close = openStream(conn, e => setSnap(p => mergeEvent(p ?? normalizeSnapshot(null), e)), ok => !dead && setStatus(ok ? 'live' : 'offline'));
    }).catch(() => !dead && setStatus('offline'));
    return () => { dead = true; close(); };
  }, [conn]);
  return { conn, setConn, snap, status };
}
