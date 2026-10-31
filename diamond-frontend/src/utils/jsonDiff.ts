import { diffJson } from 'diff';
export interface DiffLine { kind: 'add' | 'del' | 'same'; text: string }
/** Line-level diff of two JSON values, for tool input/output comparison. */
export function jsonDiff(a: unknown, b: unknown): DiffLine[] {
  return diffJson((a ?? {}) as object, (b ?? {}) as object).flatMap(p =>
    p.value.replace(/\n$/, '').split('\n').map(text => ({ kind: p.added ? 'add' as const : p.removed ? 'del' as const : 'same' as const, text })));
}
