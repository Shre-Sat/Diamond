import { fromB64, short } from './crypto';
import { PROOF_PREFIX, GUEST_IMAGE_ID, chain } from './run';
import { toB64 } from './crypto';
import { violations } from './policy';
import type { Certificate, Check, PublishedPolicy, StepRecord, VerifyResult } from './types';

const decode = (c: Certificate): StepRecord[] | null => {
  try { if (!c.proof.startsWith(PROOF_PREFIX)) return null; const j = JSON.parse(fromB64(c.proof.slice(PROOF_PREFIX.length))); return Array.isArray(j.public_trace) ? j.public_trace : null; } catch { return null; }
};

/** Offline verifier (PRD FR-CV-2/4/5). Dev-mode proofs carry the public trace, so every statement of PRD §11.2 is re-checked here; a real zkVM receipt would replace step 1. */
export async function verifyCertificate(cert: Certificate, published: PublishedPolicy[]): Promise<VerifyResult> {
  const checks: Check[] = [], trace = decode(cert), pub = published.find(p => p.root === cert.policy.root && p.policy.policy_id === cert.policy.id && p.policy.version === cert.policy.version);
  const add = (n: string, ok: boolean, d: string) => checks.push({ n, ok, d });
  add('Proof is well-formed and was made by the expected guest image', !!trace && cert.guest_image_id === GUEST_IMAGE_ID, !trace ? 'Proof could not be decoded' : cert.guest_image_id !== GUEST_IMAGE_ID ? 'Unexpected guest image ID ' + short(cert.guest_image_id, 12) : 'Dev-mode proof: structural check only, not zero-knowledge');
  add('Policy root matches a published policy', !!pub, pub ? `${pub.policy.policy_id} v${pub.policy.version} · ${short(pub.root, 14)}` : 'Policy root ' + short(cert.policy.root, 14) + ' is not published');
  if (!trace || !pub) {
    ['Hash chain reproduces the sealed trace root', 'Step indices are consecutive (no drop, duplicate or reorder)', 'Every ALLOWED step satisfies the policy; every BLOCKED step truly violates its named rule', 'Journal counters and verdict match the trace']
      .forEach(n => add(n, false, 'Not evaluated: needs a decodable proof and a published policy'));
  } else {
    const hs = await chain(trace, cert.run_id, cert.policy.root), root = hs[hs.length - 1];
    add('Hash chain reproduces the sealed trace root', root === cert.trace_root, 'computed ' + short(root, 14) + ' vs sealed ' + short(cert.trace_root, 14));
    const badIdx = trace.map((s, k) => (s.i === k + 1 ? 0 : s.i)).filter(Boolean);
    add('Step indices are consecutive (no drop, duplicate or reorder)', !badIdx.length, badIdx.length ? 'Out-of-sequence step index ' + badIdx.join(', ') : trace.length + ' steps in order');
    const bad: string[] = [];
    trace.forEach((s, k) => {
      const v = violations(pub.policy, s, trace.slice(0, k));
      if (s.decision === 'ALLOWED' ? v.length > 0 : !s.violated_rule || !v.includes(s.violated_rule)) bad.push(`#${s.i}${s.decision === 'ALLOWED' ? ' allowed but violates ' + v[0] : ' blocked as ' + (s.violated_rule ?? '—') + ' but that rule is not violated'}`);
    });
    add('Every ALLOWED step satisfies the policy; every BLOCKED step truly violates its named rule', !bad.length, bad.length ? bad.join('; ') : 'All ' + trace.length + ' steps re-evaluated');
    const al = trace.filter(s => s.decision === 'ALLOWED').length, J = cert.journal;
    add('Journal counters and verdict match the trace', J.n_steps === trace.length && J.n_allowed === al && J.n_blocked === trace.length - al && J.verdict === 'COMPLIANT', `${al} allowed / ${trace.length - al} blocked`);
  }
  const reasons = checks.filter(c => !c.ok).map(c => c.n + ': ' + c.d);
  return { valid: !reasons.length, reasons, checks, policy: cert.policy, counts: cert.journal };
}

/* ---- tamper tests (PRD §17): each must make verification fail ---- */
export type TamperKind = 'flip-byte' | 'hide-blocked' | 'forge-blocked' | 'drop-step' | 'reorder' | 'edit-args' | 'swap-policy';
export const TAMPERS: { id: TamperKind; label: string }[] = [
  { id: 'flip-byte', label: 'Flip one byte of the trace root' }, { id: 'hide-blocked', label: 'Hide a blocked step (BLOCKED → ALLOWED)' },
  { id: 'forge-blocked', label: 'Forge a block (ALLOWED → BLOCKED)' }, { id: 'drop-step', label: 'Drop a step' },
  { id: 'reorder', label: 'Reorder two steps' }, { id: 'edit-args', label: 'Edit an argument hash' }, { id: 'swap-policy', label: 'Swap the policy root' },
];
/** Returns a modified COPY; the stored certificate is never touched. */
export function tamper(cert: Certificate, kind: TamperKind): Certificate {
  const c: Certificate = JSON.parse(JSON.stringify(cert)), t = decode(cert); if (!t) return c;
  const put = (s: StepRecord[]) => { c.proof = PROOF_PREFIX + toB64(JSON.stringify({ public_trace: s })); };
  switch (kind) {
    case 'flip-byte': { const ch = c.trace_root.slice(-1); c.trace_root = c.trace_root.slice(0, -1) + (ch === '0' ? '1' : '0'); break; }
    case 'hide-blocked': { const s = t.find(x => x.decision === 'BLOCKED'); if (s) { s.decision = 'ALLOWED'; s.violated_rule = null; } put(t); break; }
    case 'forge-blocked': { const s = t.find(x => x.decision === 'ALLOWED'); if (s) { s.decision = 'BLOCKED'; s.violated_rule = 'F1'; } put(t); break; }
    case 'drop-step': t.splice(Math.min(2, t.length - 1), 1); put(t); break;
    case 'reorder': if (t.length > 2) [t[1], t[2]] = [t[2], t[1]]; put(t); break;
    case 'edit-args': t[0].args_hash = t[0].args_hash.slice(0, -1) + (t[0].args_hash.endsWith('0') ? '1' : '0'); put(t); break;
    case 'swap-policy': c.policy.root = c.policy.root.slice(0, -1) + (c.policy.root.endsWith('0') ? '1' : '0'); break;
  }
  return c;
}
