import type { DiamondEvent, Intent, TimelineItem, ToolCall } from '@/types/event';
import { verdictOf } from './filterUtils';

const TRACK = { proc: 'Processes', file: 'Files', net: 'Network', policy: 'Policy' } as const;
/** One timeline item per event; a process start runs until its exit (or the session end). */
export function toTimelineItems(events: DiamondEvent[], intent: Intent): TimelineItem[] {
  const end = events.length ? events[events.length - 1].t : 0;
  const exits = new Map<number, number>();
  events.forEach(e => { if (e.cat === 'proc' && e.op === 'exit') exits.set(e.pid, e.t); });
  return events.filter(e => !(e.cat === 'proc' && e.op === 'exit')).map(e => ({
    id: e.id, track: TRACK[e.cat], t0: e.t,
    t1: e.cat === 'proc' ? exits.get(e.pid) ?? end : e.t,
    label: `${e.op} ${e.res ?? e.name ?? ''}`.trim(), verdict: verdictOf(e, intent),
  }));
}
/** Commands the agent ran, taken from process starts (no inferred tool names). */
export const extractToolCalls = (events: DiamondEvent[]): ToolCall[] =>
  events.filter(e => e.cat === 'proc' && e.op === 'start' && e.cmd).map(e => ({ id: String(e.id), name: e.name ?? 'process', input: { cmd: e.cmd, pid: e.pid, ppid: e.ppid }, t: e.t }));
