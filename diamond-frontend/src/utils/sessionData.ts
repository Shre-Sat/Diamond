import type { CodingPlanStep, DiamondEvent, DiamondSnapshot, Intent } from '@/types/event';
import { verdictOf } from './filterUtils';

export const emptyIntent: Intent = { task: '', workspace: '', allowFiles: [], allowNet: [], restricted: [] };
export function normalizeSnapshot(raw: Partial<DiamondSnapshot> | null | undefined): DiamondSnapshot {
  const events = [...(raw?.events ?? [])].sort((a, b) => a.t - b.t || a.id - b.id);
  return { session: raw?.session ?? 'unknown', agent: raw?.agent ?? 'unknown', intent: raw?.intent ?? emptyIntent, events };
}
export function mergeEvent(s: DiamondSnapshot, e: DiamondEvent): DiamondSnapshot {
  if (s.events.some(x => x.id === e.id)) return s;
  return { ...s, events: [...s.events, e].sort((a, b) => a.t - b.t || a.id - b.id) };
}
export function summarize(s: DiamondSnapshot) {
  const v = s.events.map(e => verdictOf(e, s.intent));
  return {
    events: s.events.length, processes: s.events.filter(e => e.cat === 'proc' && e.op === 'start').length,
    flagged: v.filter(x => x === 'flagged').length, unexpected: v.filter(x => x === 'unexpected').length, denied: v.filter(x => x === 'denied').length,
    simulated: s.events.some(e => e.sim), durationMs: s.events.length ? s.events[s.events.length - 1].t : 0,
  };
}
/** A plan only exists if the backend sends 'plan' events; nothing is invented. */
export const parsePlan = (events: DiamondEvent[]): CodingPlanStep[] =>
  events.filter(e => e.op === 'plan').map(e => ({ title: e.note ?? e.res ?? 'step', state: e.status === 'observed' ? 'done' : 'active' }));
