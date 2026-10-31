import type { Cat, DiamondEvent, Intent, Severity, Verdict } from '@/types/event';

export function verdictOf(e: DiamondEvent, i: Intent): Verdict {
  if (e.status.startsWith('denied')) return 'denied';
  if (e.status === 'flagged' || e.status === 'pending') return 'flagged';
  if (e.cat === 'file' && e.res && !i.allowFiles.some(p => e.res!.startsWith(p))) return 'unexpected';
  if (e.cat === 'net' && e.res && !i.allowNet.includes(e.res)) return 'unexpected';
  return 'authorized';
}
export const severityOf = (v: Verdict): Severity => (v === 'denied' ? 'critical' : v === 'authorized' ? 'info' : 'warn');

export interface EventQuery { cats: Set<Cat>; q: string; severities: Set<Severity> }
export const allCats = (): Set<Cat> => new Set<Cat>(['proc', 'file', 'net', 'policy']);
export const allSeverities = (): Set<Severity> => new Set<Severity>(['info', 'warn', 'critical']);

export function filterEvents(events: DiamondEvent[], q: EventQuery, intent: Intent): DiamondEvent[] {
  const s = q.q.trim().toLowerCase();
  return events.filter(e => q.cats.has(e.cat) && q.severities.has(severityOf(verdictOf(e, intent))) &&
    (!s || `${e.op} ${e.res ?? ''} ${e.name ?? ''} ${e.cmd ?? ''} ${e.pid}`.toLowerCase().includes(s)));
}
