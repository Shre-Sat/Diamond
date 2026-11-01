'use client';
import type { DiamondEvent, Intent, ProcessInfo } from '@/types/event';
import UnifiedBlock from './UnifiedBlock';

export default function ProcessNode({ node, intent, onSelect }: { node: ProcessInfo; intent: Intent; onSelect: (e: DiamondEvent) => void }) {
  const hot = node.status === 'flagged' || node.status.startsWith('denied');
  return (
    <li className="pl-4 border-l border-white/10 py-1">
      <div className="flex items-baseline gap-2">
        <span className={`font-medium ${hot ? 'text-accent' : ''}`}>{node.name}</span>
        <span className="font-mono text-[11px] text-t3">pid {node.pid} · ppid {node.ppid}</span>
        <span className="text-[11px] text-t2">{node.alive ? 'running' : 'exited'}</span>
      </div>
      <div className="font-mono text-[11px] text-t3 truncate">{node.cmd}</div>
      <UnifiedBlock events={node.events.filter(e => !(e.cat === 'proc' && e.op === 'start'))} intent={intent} onSelect={onSelect} />
      {node.children.length > 0 && <ul>{node.children.map(c => <ProcessNode key={c.pid} node={c} intent={intent} onSelect={onSelect} />)}</ul>}
    </li>
  );
}
