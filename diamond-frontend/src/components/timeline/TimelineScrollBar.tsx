'use client';
import type { View } from './TimelineAxis';
export default function TimelineScrollBar({ duration, view, onView }: { duration: number; view: View; onView: (v: View) => void }) {
  const span = view.end - view.start, max = Math.max(0, duration - span);
  return <input type="range" aria-label="Scroll timeline" min={0} max={max} step={Math.max(1, Math.round(span / 100))} value={Math.min(view.start, max)} disabled={max === 0}
    onChange={e => { const s = +e.target.value; onView({ start: s, end: s + span }); }} className="w-full accent-accent" />;
}
