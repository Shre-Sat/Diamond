import { sha } from './crypto';

/** Deterministic label tagger (PRD §8.3). Regex only in this frontend demo; the real one is Presidio + custom patterns on the gateway. */
export const TAGGER_VERSION = 'poa-tagger/0.1-regex';
const PATTERNS: [string, RegExp][] = [
  ['PII.AADHAAR', /\b\d{4}\s\d{4}\s\d{4}\b/],
  ['PII.PAN', /\b[A-Z]{5}\d{4}[A-Z]\b/],
  ['PII.SSN', /\b\d{3}-\d{2}-\d{4}\b/],
  ['PII.PHONE', /(?:\+91[\s-]?)?\b[6-9]\d{9}\b/],
  ['PII.EMAIL', /[\w.+-]+@[\w-]+\.[\w.]+/],
  ['SECRET.APIKEY', /\bsk-[A-Za-z0-9-]{16,}\b/],
  ['FIN.ACCOUNT', /\bacct-\d{3,}\b/],
];
/** Routing fields are not content: the recipient address must not tag every email as PII.EMAIL. */
const ROUTING = new Set(['to', 'from', 'id', 'user']);
export const taggerHash = () => sha(TAGGER_VERSION + PATTERNS.map(([l, r]) => l + r.source).join('|'));

const leaves = (v: unknown, key = '', out: string[] = []): string[] => {
  if (typeof v === 'string' || typeof v === 'number') { if (!ROUTING.has(key)) out.push(String(v)); }
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) leaves(x, k, out);
  return out;
};
export const tokens = (v: unknown) => leaves(v).flatMap(s => [s, ...s.split(/\s+/)]).filter(t => t.length >= 4);

/** Labels detected in content (FR-LT-1) plus labels carried by values that came from earlier tool outputs, matched by value hash (FR-LT-2). */
export async function tagInputs(args: Record<string, unknown>, valueLabels: Map<string, string[]>): Promise<string[]> {
  const found = new Set<string>(), toks = tokens(args);
  for (const s of leaves(args)) for (const [l, re] of PATTERNS) if (re.test(s)) found.add(l);
  for (const t of toks) { const l = valueLabels.get(await sha(t)); if (l) l.forEach(x => found.add(x)); }
  return [...found].sort();
}
