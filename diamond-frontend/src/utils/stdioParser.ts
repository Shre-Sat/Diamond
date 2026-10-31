const ANSI = /\u001b\[[0-9;?]*[ -/]*[@-~]/g;
export const stripAnsi = (s: string): string => s.replace(ANSI, '');
/** Splits raw PTY output into display lines, tagging stderr lines passed with a prefix. */
export function parseStdio(raw: string): { text: string; err: boolean }[] {
  return stripAnsi(raw).split(/\r?\n/).filter(Boolean).map(l => (l.startsWith('stderr:') ? { text: l.slice(7).trim(), err: true } : { text: l, err: false }));
}
