'use client';
import type { Cat, ProcessInfo } from '@/types/event';
export interface TreeFilter { name: string; state: 'all' | 'running' | 'exited'; kind: Cat | 'all'; flaggedOnly: boolean }
export const defaultTreeFilter: TreeFilter = { name: '', state: 'all', kind: 'all', flaggedOnly: false };

const keep = (p: ProcessInfo, f: TreeFilter) =>
  p.name.toLowerCase().includes(f.name.toLowerCase()) && (f.state === 'all' || (f.state === 'running') === p.alive) &&
  (f.kind === 'all' || p.events.some(e => e.cat === f.kind)) && (!f.flaggedOnly || p.status !== 'observed');
/** Keeps a node if it matches or any descendant matches, so the path to a match stays visible. */
export function filterTree(nodes: ProcessInfo[], f: TreeFilter): ProcessInfo[] {
  return nodes.flatMap(p => { const kids = filterTree(p.children, f); return keep(p, f) || kids.length ? [{ ...p, children: kids }] : []; });
}
export default function ProcessTreeFilters({ value, onChange }: { value: TreeFilter; onChange: (f: TreeFilter) => void }) {
  const cls = 'bg-s1 border border-white/10 px-2 py-1 text-sm';
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input className={cls} placeholder="Process name" aria-label="Process name" value={value.name} onChange={e => onChange({ ...value, name: e.target.value })} />
      <select className={cls} aria-label="State" value={value.state} onChange={e => onChange({ ...value, state: e.target.value as TreeFilter['state'] })}><option value="all">Any state</option><option value="running">Running</option><option value="exited">Exited</option></select>
      <select className={cls} aria-label="Event kind" value={value.kind} onChange={e => onChange({ ...value, kind: e.target.value as TreeFilter['kind'] })}><option value="all">Any event</option><option value="file">File</option><option value="net">Network</option><option value="policy">Policy</option></select>
      <label className="text-sm text-t2 flex items-center gap-1"><input type="checkbox" checked={value.flaggedOnly} onChange={e => onChange({ ...value, flaggedOnly: e.target.checked })} />Flagged or denied only</label>
    </div>
  );
}
