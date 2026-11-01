export interface View { start: number; end: number }
/** Time ticks along the top of the timeline. x is in a 0..W coordinate space. */
export default function TimelineAxis({ view, width }: { view: View; width: number }) {
  const span = Math.max(1, view.end - view.start), steps = [100, 250, 500, 1000, 2000, 5000, 10000, 30000, 60000], step = steps.find(s => span / s <= 10) ?? 60000;
  const ticks: number[] = []; for (let t = Math.ceil(view.start / step) * step; t <= view.end; t += step) ticks.push(t);
  return (
    <g>{ticks.map(t => { const x = ((t - view.start) / span) * width; return (
      <g key={t}><line x1={x} x2={x} y1={14} y2={20} stroke="#85817E" /><text x={x + 3} y={11} fontSize={10} fill="#85817E" fontFamily="monospace">{(t / 1000).toFixed(t % 1000 ? 2 : 0)}s</text></g>); })}</g>
  );
}
