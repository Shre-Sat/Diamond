'use client';
import { useMemo, useState } from 'react';
import { ConnectionGate } from '@/components/ConnectionDialog';
import EventFilters from '@/components/common/EventFilters';
import EventModal from '@/components/common/EventModal';
import { toBlock } from '@/components/process-tree/BlockAdapters';
import { allCats, allSeverities, filterEvents, verdictOf, type EventQuery } from '@/utils/filterUtils';
import type { DiamondEvent, DiamondSnapshot } from '@/types/event';

function Logs({ snap }: { snap: DiamondSnapshot }) {
  const [q, setQ] = useState<EventQuery>({ cats: allCats(), q: '', severities: allSeverities() });
  const [sel, setSel] = useState<DiamondEvent | null>(null);
  const rows = useMemo(() => filterEvents(snap.events, q, snap.intent), [snap, q]);
  return (
    <div className="space-y-3">
      <EventFilters query={q} onChange={setQ} />
      <div className="border border-white/10">{rows.map(e => <button key={e.id} onClick={() => setSel(e)} className="flex w-full gap-3 px-2 py-1 text-left border-t first:border-t-0 border-white/10 hover:bg-s1 font-mono text-[12px]">
        <span className="text-t3 w-14">{(e.t / 1000).toFixed(1)}s</span><span className="w-14 uppercase">{toBlock(e).kind}</span><span className="flex-1 truncate">{toBlock(e).text}</span><span className={verdictOf(e, snap.intent) === 'denied' ? 'text-accent' : 'text-t3'}>{e.status}</span></button>)}</div>
      {sel && <EventModal event={sel} intent={snap.intent} onClose={() => setSel(null)} />}
    </div>
  );
}
export default function Page() { return <ConnectionGate>{snap => <Logs snap={snap} />}</ConnectionGate>; }
