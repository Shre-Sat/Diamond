'use client';
import type { View } from './TimelineAxis';
export default function ZoomControls({ duration, view, onView }: { duration: number; view: View; onView: (v: View) => void }) {
  const zoom = (k: number) => { const c = (view.start + view.end) / 2, h = Math.max(100, ((view.end - view.start) * k) / 2), s = Math.max(0, Math.min(duration - 2 * h, c - h)); onView({ start: s, end: Math.min(duration, s + 2 * h) }); };
  const b = 'px-2 py-1 text-sm border border-white/10 bg-s1 hover:bg-s2';
  return <div className="flex gap-1" role="group" aria-label="Zoom"><button className={b} onClick={() => zoom(.5)} aria-label="Zoom in">＋</button><button className={b} onClick={() => zoom(2)} aria-label="Zoom out">－</button><button className={b} onClick={() => onView({ start: 0, end: Math.max(1, duration) })}>Fit</button></div>;
}
