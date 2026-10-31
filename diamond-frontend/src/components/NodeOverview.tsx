'use client';
import type { DiamondSnapshot } from '@/types/event';
import { summarize } from '@/utils/sessionData';
import { flattenTree, buildProcessTree } from '@/utils/eventParsers';
import { sessionState } from '@/lib/sessionState.mjs';

export default function NodeOverview({ snap }: { snap: DiamondSnapshot }) {
  const s = summarize(snap), last = snap.events.length ? snap.events[snap.events.length - 1].t : 0;
  const top = flattenTree(buildProcessTree(snap.events)).sort((a, b) => b.events.length - a.events.length).slice(0, 5);
  const state = sessionState({ lastEventAt: snap.events.length ? Date.now() : 0, exited: false });
  const stat = (n: number, l: string, hot = false) => <div><b className={`block text-2xl font-medium ${hot && n ? 'text-accent' : ''}`}>{n}</b><span className="text-xs text-t3">{l}</span></div>;
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-8">{stat(s.processes, 'processes')}{stat(s.events, 'events')}{stat(s.flagged + s.unexpected, 'flagged / unexpected', true)}{stat(s.denied, 'denied', true)}</div>
      <p className="text-sm text-t2">Session <span className="font-mono">{snap.session}</span> · agent {snap.agent} · {state === 'running' ? 'receiving events' : 'idle'} · {(last / 1000).toFixed(1)}s of activity{s.simulated && <span className="ml-2 text-[10px] px-1.5 bg-accent text-white font-mono uppercase">Simulated</span>}</p>
      <div><h3 className="text-xs uppercase tracking-widest text-t3 mb-1">Most active processes</h3>
        {top.map(p => <div key={p.pid} className="flex gap-3 border-t border-white/10 py-1 text-sm"><span>{p.name}</span><span className="font-mono text-t3 text-xs">pid {p.pid}</span><span className="ml-auto font-mono text-xs">{p.events.length} events</span></div>)}</div>
    </section>
  );
}
