'use client';
import type { TimelineItem } from '@/types/event';
import type { View } from './TimelineAxis';
import { VERDICT_COLOR } from './TimelineGroup';
/** Whole-session overview; clicking centers the visible window there. */
export default function TimelineMinimap({ items, duration, view, onView, width }: { items: TimelineItem[]; duration: number; view: View; onView: (v: View) => void; width: number }) {
  const d = Math.max(1, duration), X = (t: number) => (t / d) * width, span = view.end - view.start;
  return (
    <svg width="100%" viewBox={`0 0 ${width} 34`} preserveAspectRatio="none" height={34} role="img" aria-label="Session minimap" className="bg-s1 cursor-pointer"
      onClick={e => { const r = e.currentTarget.getBoundingClientRect(), c = ((e.clientX - r.left) / r.width) * d, s = Math.max(0, Math.min(d - span, c - span / 2)); onView({ start: s, end: s + span }); }}>
      {items.map(i => <rect key={i.id} x={X(i.t0)} y={8} width={Math.max(2, X(i.t1) - X(i.t0))} height={14} fill={VERDICT_COLOR[i.verdict]} opacity={.6} />)}
      <rect x={X(view.start)} y={1} width={Math.max(6, X(view.end) - X(view.start))} height={32} fill="rgba(241,85,52,.12)" stroke="#F15534" />
    </svg>
  );
}
