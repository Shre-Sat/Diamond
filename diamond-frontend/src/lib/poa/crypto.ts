/** Hash helpers (WebCrypto SHA-256; PRD §11.1 MVP primitive). */
export const sha = async (s: string): Promise<string> =>
  [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('');

/** Canonical JSON: sorted keys at every level (PRD §9.3). */
export function canon(v: unknown): string {
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v as object).sort().map(k => JSON.stringify(k) + ':' + canon((v as Record<string, unknown>)[k])).join(',') + '}';
  return JSON.stringify(v === undefined ? null : v);
}
export const short = (h: string | null | undefined, n = 10) => (h ? (h.length > n + 2 ? h.slice(0, n) + '…' : h) : '—');

/** Binary Merkle tree over hex leaves; an odd node is paired with itself. Returns the hex root (no 0x). */
export async function merkleRoot(leaves: string[]): Promise<string> {
  if (!leaves.length) return sha('');
  let lvl = leaves;
  while (lvl.length > 1) {
    const nx: string[] = [];
    for (let k = 0; k < lvl.length; k += 2) nx.push(await sha(lvl[k] + (lvl[k + 1] ?? lvl[k])));
    lvl = nx;
  }
  return lvl[0];
}

export const toB64 = (s: string) => { let b = ''; new TextEncoder().encode(s).forEach(c => { b += String.fromCharCode(c); }); return btoa(b); };
export const fromB64 = (s: string) => new TextDecoder().decode(Uint8Array.from(atob(s), c => c.charCodeAt(0)));
