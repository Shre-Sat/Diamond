import type { LiveOverview } from '@/types/event';
/** Cloud controller / relay client. Endpoints are assumptions until the controller API is fixed. */
export async function fetchFleet(controller: string, token?: string): Promise<LiveOverview> {
  const r = await fetch(`${controller.replace(/\/$/, '')}/api/overview`, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
  if (!r.ok) throw new Error(`overview ${r.status}`);
  return (await r.json()) as LiveOverview;
}
export async function pairRelay(controller: string, code: string): Promise<{ token: string }> {
  const r = await fetch(`${controller.replace(/\/$/, '')}/api/pair`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
  if (!r.ok) throw new Error(`pair ${r.status}`);
  return (await r.json()) as { token: string };
}
