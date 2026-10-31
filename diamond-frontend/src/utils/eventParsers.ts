import type { DiamondEvent, ProcessInfo, Status } from '@/types/event';
const rank = (s: Status) => (s.startsWith('denied') ? 2 : s === 'flagged' || s === 'pending' ? 1 : 0);

/** Rebuilds the parent-child process tree from the flat event stream (events with t <= upTo). */
export function buildProcessTree(events: DiamondEvent[], upTo = Infinity): ProcessInfo[] {
  const map = new Map<number, ProcessInfo>();
  for (const e of events) {
    if (e.t > upTo) break;
    if (e.cat === 'proc' && e.op === 'start')
      map.set(e.pid, { pid: e.pid, ppid: e.ppid ?? 0, name: e.name ?? '?', cmd: e.cmd ?? '', alive: true, status: 'observed', children: [], events: [e] });
    else {
      const p = map.get(e.pid); if (!p) continue;
      p.events.push(e);
      if (e.cat === 'proc' && e.op === 'exit') p.alive = false;
      if (rank(e.status) > rank(p.status)) p.status = e.status;
    }
  }
  const roots: ProcessInfo[] = [];
  map.forEach(p => { const par = map.get(p.ppid); (par ? par.children : roots).push(p); });
  return roots;
}
export const flattenTree = (n: ProcessInfo[]): ProcessInfo[] => n.flatMap(p => [p, ...flattenTree(p.children)]);
