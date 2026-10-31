'use client';
import { ConnectionGate } from '@/components/ConnectionDialog';
import type { DiamondSnapshot } from '@/types/event';

function Bars({ title, data }: { title: string; data: [string, number][] }) {
  const max = Math.max(1, ...data.map(d => d[1]));
  return <div><h3 className="text-xs uppercase tracking-widest text-t3 mb-2">{title}</h3>{data.map(([k, v]) => (
    <div key={k} className="flex items-center gap-2 text-xs mb-1"><span className="w-28 text-t2">{k}</span><div className="h-2 bg-accent" style={{ width: `${(v / max) * 60}%` }} /><span className="font-mono">{v}</span></div>))}</div>;
}
function Metrics({ snap }: { snap: DiamondSnapshot }) {
  const count = (f: (e: DiamondSnapshot['events'][number]) => string) => { const m = new Map<string, number>(); snap.events.forEach(e => m.set(f(e), (m.get(f(e)) ?? 0) + 1)); return [...m.entries()]; };
  return (
    <div className="space-y-6">
      <Bars title="Events by category" data={count(e => e.cat)} />
      <Bars title="Events by status" data={count(e => e.status)} />
      <Bars title="Events per second of session" data={count(e => String(Math.floor(e.t / 1000)).padStart(3, '0') + 's').sort()} />
      <p className="text-xs text-t3">CPU, memory and token metrics need a metrics endpoint on the daemon. They are not part of the current event stream.</p>
    </div>
  );
}
export default function Page() { return <ConnectionGate>{snap => <Metrics snap={snap} />}</ConnectionGate>; }
