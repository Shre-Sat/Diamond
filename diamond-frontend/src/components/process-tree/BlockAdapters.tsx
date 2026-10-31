import type { DiamondEvent } from '@/types/event';
/** Adapters turn a raw event into a one-line block (kind label + text). */
export interface Block { kind: string; text: string }
const adapters: Record<DiamondEvent['cat'], (e: DiamondEvent) => Block> = {
  proc: e => ({ kind: e.op === 'exit' ? 'exit' : 'exec', text: e.op === 'exit' ? `exited (${e.name ?? e.pid})` : e.cmd ?? e.name ?? '' }),
  file: e => ({ kind: e.op, text: e.res ?? '' }),
  net: e => ({ kind: 'socket', text: `${e.op} ${e.res ?? ''}` }),
  policy: e => ({ kind: 'policy', text: `${e.res ?? ''} → ${e.status}` }),
};
export const toBlock = (e: DiamondEvent): Block => adapters[e.cat](e);
