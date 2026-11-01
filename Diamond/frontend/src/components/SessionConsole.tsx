'use client';
import type { DiamondSnapshot } from '@/types/event';
import { toBlock } from './process-tree/BlockAdapters';
import { verdictOf } from '@/utils/filterUtils';
import { stripAnsi } from '@/utils/stdioParser';

/** Command stream: what the agent's processes actually did, in order. No LLM transcript is invented. */
export default function SessionConsole({ snap }: { snap: DiamondSnapshot }) {
  return (
    <div className="bg-deep border border-white/10 p-3 font-mono text-[12px] max-h-[60vh] overflow-auto" role="log" aria-label="Command stream">
      <div className="text-t3 mb-2">Task: {snap.intent.task || '—'}</div>
      {snap.events.map(e => { const b = toBlock(e), v = verdictOf(e, snap.intent); return (
        <div key={e.id} className={v === 'denied' ? 'text-accent' : v === 'authorized' ? 'text-t2' : 'text-warn'}>
          <span className="text-t3">[{(e.t / 1000).toFixed(1)}s pid {e.pid}]</span> {b.kind} {stripAnsi(b.text)}{e.sim && ' (simulated)'}</div>); })}
    </div>
  );
}
