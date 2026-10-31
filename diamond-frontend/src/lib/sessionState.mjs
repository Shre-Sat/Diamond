/** Running vs stopped heuristics for a session. */
export const STALE_MS = 30000;
/** @param {{lastEventAt:number, exited?:boolean}} s @param {number} now */
export function sessionState(s, now = Date.now()) {
  if (s.exited) return 'stopped';
  return now - s.lastEventAt > STALE_MS ? 'idle' : 'running';
}
