import type { LiveOverview } from '@/types/event';
export const summarizeFleet = (o: LiveOverview) => ({
  online: o.nodes.filter(n => n.online).length, total: o.nodes.length,
  agents: o.nodes.reduce((a, n) => a + n.agents, 0), sessions: o.nodes.reduce((a, n) => a + n.sessions, 0),
  capacityPct: o.capacity.total ? Math.round((o.capacity.used / o.capacity.total) * 100) : 0,
});
/** Polls a loader on an interval; returns a stop function. */
export function pollFleet(load: () => Promise<LiveOverview>, onData: (o: LiveOverview) => void, ms = 5000): () => void {
  let stop = false;
  const tick = async () => { try { const o = await load(); if (!stop) onData(o); } catch { /* keep last data */ } };
  void tick(); const h = setInterval(tick, ms);
  return () => { stop = true; clearInterval(h); };
}
