'use client';
import { useEffect, useMemo, useState } from 'react';
import type { DiamondSnapshot, DiamondEvent } from '@/types/event';
import { toTimelineItems } from '@/utils/eventProcessing';
import { allCats, allSeverities, filterEvents, type EventQuery } from '@/utils/filterUtils';
import EventFilters from '../common/EventFilters';
import EventModal from '../common/EventModal';
import TimelineAxis, { type View } from './TimelineAxis';
import TimelineGroup from './TimelineGroup';
import TimelineMinimap from './TimelineMinimap';
import TimelineScrollBar from './TimelineScrollBar';
import ZoomControls from './ZoomControls';

const W = 1000, TRACKS = ['Processes', 'Files', 'Network', 'Policy'];
export default function Timeline({ snap }: { snap: DiamondSnapshot }) {
  const [q, setQ] = useState<EventQuery>({ cats: allCats(), q: '', severities: allSeverities() });
  const duration = snap.events.length ? snap.events[snap.events.length - 1].t : 1;
  const [view, setView] = useState<View>({ start: 0, end: Math.max(1, duration) });
  const [sel, setSel] = useState<DiamondEvent | null>(null);
  useEffect(() => { setView(v => (v.start === 0 ? { start: 0, end: Math.max(1, duration) } : v)); }, [duration]);
  const kept = useMemo(() => filterEvents(snap.events, q, snap.intent), [snap, q]);
  const items = useMemo(() => toTimelineItems(kept, snap.intent), [kept, snap.intent]);
  const open = (id: number) => setSel(snap.events.find(e => e.id === id) ?? null);
  const prev = sel ? [...snap.events].reverse().find(e => e.pid === sel.pid && e.t < sel.t) : undefined;
  return (
    <div className="space-y-3">
      <EventFilters query={q} onChange={setQ} />
      <div className="flex items-center gap-3"><ZoomControls duration={duration} view={view} onView={setView} /><span className="font-mono text-xs text-t3">{(view.start / 1000).toFixed(1)}s – {(view.end / 1000).toFixed(1)}s</span></div>
      <div className="overflow-x-auto bg-deep border border-white/10">
        <svg viewBox={`0 0 ${W} ${TRACKS.length * 30 + 28}`} width="100%" role="img" aria-label="Event timeline">
          <TimelineAxis view={view} width={W} />
          {TRACKS.map((t, i) => <TimelineGroup key={t} track={t} items={items.filter(x => x.track === t)} view={view} width={W} y={26 + i * 30} onSelect={open} selected={sel?.id ?? null} />)}
        </svg>
      </div>
      <TimelineScrollBar duration={duration} view={view} onView={setView} />
      <TimelineMinimap items={items} duration={duration} view={view} onView={setView} width={W} />
      {sel && <EventModal event={sel} prev={prev} intent={snap.intent} onClose={() => setSel(null)} />}
    </div>
  );
}
