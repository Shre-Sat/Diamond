import type { TimelineItem } from '@/types/event';
import type { View } from './TimelineAxis';
export const VERDICT_COLOR = { authorized: '#8a8682', flagged: '#E7B768', unexpected: '#E7B768', denied: '#F15534' } as const;
/** One track (row) of items. Items are clipped to the visible window. */
export default function TimelineGroup({ track, items, view, width, y, onSelect, selected }: { track: string; items: TimelineItem[]; view: View; width: number; y: number; onSelect: (id: number) => void; selected: number | null }) {
  const span = Math.max(1, view.end - view.start), X = (t: number) => ((t - view.start) / span) * width;
  return (
    <g>
      <text x={4} y={y + 12} fontSize={10} fill="#B4B0AC">{track}</text>
      <line x1={0} x2={width} y1={y + 22} y2={y + 22} stroke="rgba(255,255,255,.07)" />
      {items.filter(i => i.t1 >= view.start && i.t0 <= view.end).map(i => (
        <g key={i.id} onClick={() => onSelect(i.id)} style={{ cursor: 'pointer' }} tabIndex={0} role="button" aria-label={i.label}
          onKeyDown={e => e.key === 'Enter' && onSelect(i.id)}>
          <title>{i.label}</title>
          <rect x={X(i.t0)} y={y + 16} width={Math.max(4, X(i.t1) - X(i.t0))} height={10} rx={2} fill={VERDICT_COLOR[i.verdict]} opacity={i.t0 === i.t1 ? 1 : 0.55} stroke={selected === i.id ? '#fff' : 'none'} />
        </g>))}
    </g>
  );
}
