import type { Conn } from './connection';
import type { DiamondEvent, DiamondSnapshot } from '@/types/event';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const wsUrl = (c: Conn) => c.url.replace(/^http/, 'ws').replace(/\/$/, '') + '/ws' + (c.token ? `?token=${encodeURIComponent(c.token)}` : '');
const headers = (c: Conn): HeadersInit => (c.token ? { Authorization: `Bearer ${c.token}` } : {});

export async function fetchSnapshot(c: Conn): Promise<DiamondSnapshot> {
  const url = c.mode === 'demo' ? `${basePath}/sample-snapshot.json` : `${c.url.replace(/\/$/, '')}/api/snapshot`;
  const r = await fetch(url, { headers: c.mode === 'demo' ? undefined : headers(c) });
  if (!r.ok) throw new Error(`snapshot ${r.status}`);
  return (await r.json()) as DiamondSnapshot;
}
/** Opens the live event WebSocket; each message is one DiamondEvent. Returns a close function. */
export function openStream(c: Conn, onEvent: (e: DiamondEvent) => void, onState: (ok: boolean) => void): () => void {
  const ws = new WebSocket(wsUrl(c));
  ws.onopen = () => onState(true); ws.onclose = () => onState(false); ws.onerror = () => onState(false);
  ws.onmessage = m => { try { const e = JSON.parse(String(m.data)) as DiamondEvent; if (e && e.cat && e.id != null) onEvent(e); } catch { /* ignore malformed */ } };
  return () => ws.close();
}
