import { canon, sha, toB64 } from './crypto';
import { BANKING_POLICY, publishPolicy, violations } from './policy';
import { SCENARIOS } from './scenarios';
import { taggerHash, tagInputs, tokens } from './tagger';
import type { ArgsFeatures, Certificate, Policy, RunData, Scenario, StepRecord } from './types';

export const GATEWAY_VERSION = 'poa-gateway-sim/0.1';
export const GUEST_IMAGE_ID = '0x' + 'd3v'.padEnd(64, '0'); // placeholder image ID for dev-mode proofs
export const PROOF_PREFIX = 'dev-mode:';

export const stepBody = (s: StepRecord) => { const { chain_hash: _c, ...rest } = s; return canon(rest); };
/** h_0 = H(run_id || P); h_i = H(h_{i-1} || serialize(s_i)). Returns each h_i. */
export async function chain(steps: StepRecord[], runId: string, policyRoot: string): Promise<string[]> {
  let h = await sha(runId + policyRoot); const out: string[] = [];
  for (const s of steps) { h = await sha(h + stepBody(s)); out.push('0x' + h); }
  return out;
}

export async function features(p: Policy, session: Scenario['session'], tool: string, args: Record<string, string | number>): Promise<ArgsFeatures> {
  const to = typeof args.to === 'string' ? args.to : null, dom = to ? to.split('@')[1] ?? '' : null, list = p.tools[tool]?.sinks?.domain_allowlist;
  return {
    amount: typeof args.amount === 'number' ? args.amount : null,
    sink: dom == null || !list ? null : list.includes(dom) ? 'internal' : 'external',
    domain_hash: dom == null ? null : '0x' + (await sha(dom)).slice(0, 16),
    from_session: tool === 'transfer_funds' ? args.from === session.user_account : null,
  };
}

/** Plays a scripted agent through the gateway simulation: tag, evaluate BEFORE execution, log every call (blocked calls too), extend the hash chain. */
export async function executeScenario(sc: Scenario, policy: Policy = BANKING_POLICY): Promise<RunData> {
  const pub = await publishPolicy(policy), run_id = 'run-' + (await sha(sc.id)).slice(0, 8);
  const valueLabels = new Map<string, string[]>(), steps: StepRecord[] = [];
  for (let k = 0; k < sc.steps.length; k++) {
    const x = sc.steps[k], f = await features(policy, sc.session, x.tool, x.args), labels = await tagInputs(x.args, valueLabels);
    const rec: StepRecord = { i: k + 1, tool_id: x.tool, args_hash: '0x' + (await sha(canon(x.args))), args_features: f, input_labels: labels, output_hash: null, output_labels: [], decision: 'ALLOWED', violated_rule: null, ts: sc.started_at + Math.round(x.at / 1000), chain_hash: '' };
    const v = violations(policy, rec, steps);
    if (v.length) { rec.decision = 'BLOCKED'; rec.violated_rule = v[0]; }
    else {
      rec.output_labels = policy.tools[x.tool]?.output_labels ?? []; rec.output_hash = '0x' + (await sha(canon(x.result ?? {})));
      if (rec.output_labels.length) for (const t of tokens(x.result ?? {})) valueLabels.set(await sha(t), rec.output_labels);
    }
    steps.push(rec);
  }
  const hs = await chain(steps, run_id, pub.root); steps.forEach((s, i) => { s.chain_hash = hs[i]; });
  const root = hs[hs.length - 1] ?? '0x' + (await sha(run_id + pub.root)), allowed = steps.filter(s => s.decision === 'ALLOWED').length;
  const cert: Certificate = {
    version: '1.0', run_id, policy: { id: policy.policy_id, version: policy.version, root: pub.root }, trace_root: root,
    journal: { n_steps: steps.length, n_allowed: allowed, n_blocked: steps.length - allowed, verdict: 'COMPLIANT' },
    guest_image_id: GUEST_IMAGE_ID, proof: PROOF_PREFIX + toB64(JSON.stringify({ public_trace: steps })),
    issued_at: sc.started_at + Math.round((sc.steps[sc.steps.length - 1]?.at ?? 0) / 1000) + 5, anchor: null,
    metadata: { tagger_hash: '0x' + (await taggerHash()), gateway_version: GATEWAY_VERSION, started_at: sc.started_at, signature: null },
  };
  return { run_id, scenario: sc, policy_id: policy.policy_id, policy_root: pub.root, steps, at_ms: sc.steps.map(s => s.at), cert };
}
export const buildAllRuns = () => Promise.all(SCENARIOS.map(s => executeScenario(s)));
