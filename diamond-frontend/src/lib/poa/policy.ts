import { canon, merkleRoot, sha } from './crypto';
import type { Policy, PublishedPolicy, StepRecord } from './types';

/** The banking policy from PRD §9.1. */
export const BANKING_POLICY: Policy = {
  policy_id: 'banking-agent-v1', version: 3,
  tools: {
    verify_identity: { allow: true },
    get_account: { allow: true, output_labels: ['FIN.ACCOUNT'] },
    transfer_funds: { allow: true, args: { amount: { max: 50000 }, from: { equals_session: 'user_account' } } },
    send_email: { allow: true, sinks: { domain_allowlist: ['bank.example'] } },
    read_patient_record: { allow: false },
  },
  flow_rules: [
    { id: 'F1', forbid_labels: ['PII.SSN', 'PII.AADHAAR'], to_sinks: ['send_email.external'] },
    { id: 'F2', forbid_labels: ['SECRET.APIKEY'], to_sinks: ['*'] },
  ],
  limits: { max_steps: 64, max_transfers: 3 },
  ordering: [{ id: 'O1', require_before: { tool: 'transfer_funds', after: 'verify_identity' } }],
};

export type EvalStep = Pick<StepRecord, 'i' | 'tool_id' | 'args_features' | 'input_labels'>;
export type EvalHistory = Pick<StepRecord, 'tool_id' | 'decision'>[];
export interface CompiledRule { id: string; kind: Kind; text: string; spec: Record<string, unknown>; violates(s: EvalStep, h: EvalHistory): boolean }
type Kind = 'default_deny' | 'tool_disallowed' | 'ordering' | 'flow' | 'arg_constraint' | 'sink_allowlist' | 'limit';
/** When several rules are violated the gateway names the first by this rank (flow rules before sink rules, so the PII rule is the one shown). */
const RANK: Record<Kind, number> = { default_deny: 0, tool_disallowed: 1, ordering: 2, flow: 3, arg_constraint: 4, sink_allowlist: 5, limit: 6 };

const sinkMatch = (s: EvalStep, pat: string) => {
  if (pat === '*') return true;
  const [tool, kind] = pat.split('.');
  return s.tool_id === tool && (!kind || s.args_features.sink === kind);
};

const cache = new WeakMap<Policy, CompiledRule[]>();
/** Compiles the policy into individually checkable rules with stable IDs (FR-PE-3, FR-PE-5). */
export function compilePolicy(p: Policy): CompiledRule[] {
  const hit = cache.get(p); if (hit) return hit;
  const R: CompiledRule[] = [];
  R.push({ id: 'DEFAULT_DENY', kind: 'default_deny', text: 'Tool is absent from the policy (default deny)', spec: { kind: 'default_deny' }, violates: s => !(s.tool_id in p.tools) });
  const tools = Object.keys(p.tools).sort();
  let t = 0, a = 0, sk = 0;
  for (const tool of tools) {
    const tr = p.tools[tool];
    if (!tr.allow) { const id = 'T' + ++t; R.push({ id, kind: 'tool_disallowed', text: `Tool ${tool} is explicitly forbidden`, spec: { kind: 'tool_disallowed', tool }, violates: s => s.tool_id === tool }); }
    for (const arg of Object.keys(tr.args ?? {}).sort()) {
      const c = tr.args![arg];
      for (const op of Object.keys(c).sort() as (keyof typeof c)[]) {
        const id = 'A' + ++a, value = c[op];
        const feature = (s: EvalStep) => (arg === 'amount' ? s.args_features.amount : arg === 'from' ? s.args_features.from_session : null);
        const text = op === 'max' ? `${tool}.${arg} must not exceed ${Number(value).toLocaleString('en-US')}` : op === 'min' ? `${tool}.${arg} must be at least ${value}` : op === 'equals_session' ? `${tool}.${arg} must equal the session ${value}` : `${tool}.${arg} ${op} ${JSON.stringify(value)}`;
        R.push({ id, kind: 'arg_constraint', text, spec: { kind: 'arg', tool, arg, op, value }, violates: s => {
          if (s.tool_id !== tool) return false; const f = feature(s);
          if (op === 'max') return f == null || Number(f) > Number(value);
          if (op === 'min') return f == null || Number(f) < Number(value);
          if (op === 'equals_session') return f !== true;
          return false; // equals / enum are checked by the tagger, not the circuit (PRD §9.2)
        } });
      }
    }
    if (tr.sinks) { const id = 'S' + ++sk, list = tr.sinks.domain_allowlist; R.push({ id, kind: 'sink_allowlist', text: `${tool} recipient domain must be one of: ${list.join(', ')}`, spec: { kind: 'sink', tool, domain_allowlist: list }, violates: s => s.tool_id === tool && s.args_features.sink !== 'internal' }); }
  }
  for (const f of p.flow_rules) R.push({ id: f.id, kind: 'flow', text: `Labels ${f.forbid_labels.join(', ')} must not flow to ${f.to_sinks.join(', ')}`, spec: { kind: 'flow', ...f }, violates: s => s.input_labels.some(l => f.forbid_labels.includes(l)) && f.to_sinks.some(x => sinkMatch(s, x)) });
  R.push({ id: 'L1', kind: 'limit', text: `Run may not exceed ${p.limits.max_steps} steps`, spec: { kind: 'limit', max_steps: p.limits.max_steps }, violates: s => s.i > p.limits.max_steps });
  R.push({ id: 'L2', kind: 'limit', text: `At most ${p.limits.max_transfers} transfers may execute per run`, spec: { kind: 'limit', max_transfers: p.limits.max_transfers }, violates: (s, h) => s.tool_id === 'transfer_funds' && h.filter(x => x.tool_id === 'transfer_funds' && x.decision === 'ALLOWED').length >= p.limits.max_transfers });
  for (const o of p.ordering) R.push({ id: o.id, kind: 'ordering', text: `${o.require_before.tool} requires an earlier allowed ${o.require_before.after}`, spec: { kind: 'ordering', ...o }, violates: (s, h) => s.tool_id === o.require_before.tool && !h.some(x => x.tool_id === o.require_before.after && x.decision === 'ALLOWED') });
  cache.set(p, R); return R;
}

export const ruleText = (p: Policy, id: string | null) => (id ? compilePolicy(p).find(r => r.id === id)?.text ?? id : '');
/** All rule IDs violated by this step, most specific first. */
export function violations(p: Policy, s: EvalStep, h: EvalHistory): string[] {
  return compilePolicy(p).filter(r => r.violates(s, h)).sort((x, y) => RANK[x.kind] - RANK[y.kind]).map(r => r.id);
}

/** Merkle commitment: leaf = H(rule_id || canonical_rule), sorted by rule ID; root P (PRD §9.3). */
export async function publishPolicy(p: Policy): Promise<PublishedPolicy> {
  const rules = compilePolicy(p).slice().sort((a, b) => (a.id < b.id ? -1 : 1));
  const leaves = await Promise.all(rules.map(async (r, index) => ({ index, id: r.id, text: r.text, leaf: await sha(r.id + canon(r.spec)) })));
  return { policy: p, root: '0x' + (await merkleRoot(leaves.map(l => l.leaf))), leaves };
}
