'use client';
import type { DiamondEvent, Intent } from '@/types/event';
import { verdictOf } from '@/utils/filterUtils';
import { toBlock } from './BlockAdapters';

const TONE = { authorized: 'text-t3 border-white/10', flagged: 'text-warn border-warn', unexpected: 'text-warn border-white/10', denied: 'text-accent border-accent' } as const;
/** A group of related events (all events of one process) rendered as compact blocks. */
export default function UnifiedBlock({ events, intent, onSelect }: { events: DiamondEvent[]; intent: Intent; onSelect: (e: DiamondEvent) => void }) {
  return (
    <div className="ml-4 mt-1 space-y-0.5">
      {events.map(e => { const b = toBlock(e), v = verdictOf(e, intent); return (
        <button key={e.id} onClick={() => onSelect(e)} className={`flex w-full gap-2 text-left text-[11px] font-mono border-l-2 pl-2 hover:bg-s1 ${TONE[v]}`}>
          <span className="w-12 shrink-0 uppercase">{b.kind}</span><span className="truncate">{b.text}</span></button>); })}
    </div>
  );
}
