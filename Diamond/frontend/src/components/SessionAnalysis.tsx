'use client';
import type { DiamondSnapshot } from '@/types/event';
import { extractToolCalls } from '@/utils/eventProcessing';
import { summarize } from '@/utils/sessionData';

export default function SessionAnalysis({ snap }: { snap: DiamondSnapshot }) {
  const s = summarize(snap), calls = extractToolCalls(snap.events);
  const files = snap.events.filter(e => e.cat === 'file'), nets = snap.events.filter(e => e.cat === 'net');
  const list = (title: string, rows: string[]) => <div><h3 className="text-xs uppercase tracking-widest text-t3 mb-1">{title} ({rows.length})</h3>{rows.length ? rows.map((r, i) => <div key={i} className="font-mono text-[12px] border-t border-white/10 py-0.5">{r}</div>) : <span className="text-t3 text-sm">None</span>}</div>;
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="text-sm text-t2">Flagged {s.flagged} · Unexpected {s.unexpected} · Denied {s.denied}<br />Token usage is not reported by the current telemetry.</div>
      {list('Commands run', calls.map(c => `${(c.input as { cmd: string }).cmd}`))}
      {list('File effects', files.map(e => `${e.op} ${e.res} (${e.status})`))}
      {list('Network effects', nets.map(e => `${e.op} ${e.res} (${e.status})`))}
    </div>
  );
}
