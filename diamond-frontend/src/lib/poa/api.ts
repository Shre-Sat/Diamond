import { BANKING_POLICY, publishPolicy, violations, ruleText } from './policy';
import { buildAllRuns, features } from './run';
import { tagInputs } from './tagger';
import { verifyCertificate } from './verifier';
import type { Certificate, Decision, PublishedPolicy, RunData, VerifyResult } from './types';

export interface DryRunCall { tool: string; args: Record<string, string | number>; extra_labels?: string[]; verified_identity?: boolean; prior_transfers?: number }
export interface DryRunResult { decision: Decision; rule: string | null; all_rules: string[]; reason: string; labels: string[] }

/**
 * Boundary between the UI and the gateway (PRD §12). The UI only talks to this interface.
 * `demoApi` runs the same policy/tagger/verifier logic locally on scripted runs; an HTTP implementation of
 * GET /v1/runs, GET /v1/policies/{id}, POST /v1/policies/{id}/evaluate, GET /v1/runs/{id}/certificate and POST /v1/verify can replace it.
 */
export interface PoaApi {
  mode: 'demo' | 'live';
  listRuns(filter?: { policy_id?: string }): Promise<RunData[]>;
  getPolicy(id: string): Promise<PublishedPolicy>;
  listPolicies(): Promise<PublishedPolicy[]>;
  evaluate(policyId: string, call: DryRunCall): Promise<DryRunResult>;
  getCertificate(runId: string): Promise<Certificate>;
  verify(cert: Certificate): Promise<VerifyResult>;
}

let runs: Promise<RunData[]> | null = null, pol: Promise<PublishedPolicy> | null = null;
const published = () => (pol ??= publishPolicy(BANKING_POLICY));
const all = () => (runs ??= buildAllRuns());

export const demoApi: PoaApi = {
  mode: 'demo',
  async listRuns(f) { return (await all()).filter(r => !f?.policy_id || r.policy_id === f.policy_id); },
  async getPolicy(id) { const p = await published(); if (p.policy.policy_id !== id) throw new Error('Unknown policy ' + id); return p; },
  async listPolicies() { return [await published()]; },
  async evaluate(id, call) {
    const { policy } = await demoApi.getPolicy(id), session = { user_account: 'acct-7731' };
    const f = await features(policy, session, call.tool, call.args), labels = [...new Set([...(await tagInputs(call.args, new Map())), ...(call.extra_labels ?? [])])].sort();
    const hist: { tool_id: string; decision: Decision }[] = [];
    if (call.verified_identity) hist.push({ tool_id: 'verify_identity', decision: 'ALLOWED' });
    for (let k = 0; k < (call.prior_transfers ?? 0); k++) hist.push({ tool_id: 'transfer_funds', decision: 'ALLOWED' });
    const v = violations(policy, { i: hist.length + 1, tool_id: call.tool, args_features: f, input_labels: labels }, hist);
    return { decision: v.length ? 'BLOCKED' : 'ALLOWED', rule: v[0] ?? null, all_rules: v, reason: v.length ? ruleText(policy, v[0]) : 'Every rule holds for this call', labels };
  },
  async getCertificate(runId) { const r = (await all()).find(x => x.run_id === runId); if (!r) throw new Error('Unknown run ' + runId); return r.cert; },
  async verify(cert) { return verifyCertificate(cert, await demoApi.listPolicies()); },
};
