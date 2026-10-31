/** Types follow the Proof-of-Agent PRD: §9.1 policy, §10.1 step record, §10.3 certificate, §12 API. */
export type Decision = 'ALLOWED' | 'BLOCKED';

export interface ArgConstraint { max?: number; min?: number; equals?: string | number; equals_session?: string; enum?: (string | number)[] }
export interface ToolRule {
  allow: boolean; output_labels?: string[];
  args?: Record<string, ArgConstraint>;
  sinks?: { domain_allowlist: string[] };
}
export interface FlowRule { id: string; forbid_labels: string[]; to_sinks: string[] }
export interface OrderingRule { id: string; require_before: { tool: string; after: string } }
export interface Policy {
  policy_id: string; version: number;
  tools: Record<string, ToolRule>;
  flow_rules: FlowRule[];
  limits: { max_steps: number; max_transfers: number };
  ordering: OrderingRule[];
}

/** Small set of values the circuit actually checks (PRD §10.1). Amounts/domains are hashed or bucketed in the public view. */
export interface ArgsFeatures { amount: number | null; sink: 'internal' | 'external' | null; domain_hash: string | null; from_session: boolean | null }
export interface StepRecord {
  i: number; tool_id: string; args_hash: string; args_features: ArgsFeatures;
  input_labels: string[]; output_hash: string | null; output_labels: string[];
  decision: Decision; violated_rule: string | null; ts: number;
  /** h_i = H(h_{i-1} || canonical(step without chain_hash)); recomputed by the verifier, never trusted. */
  chain_hash: string;
}

export interface Certificate {
  version: string; run_id: string;
  policy: { id: string; version: number; root: string };
  trace_root: string;
  journal: { n_steps: number; n_allowed: number; n_blocked: number; verdict: 'COMPLIANT' };
  guest_image_id: string;
  /** Dev-mode proof (PRD FR-PV-6): "dev-mode:" + base64 of the PUBLIC trace. Not a zero-knowledge proof. */
  proof: string;
  issued_at: number;
  anchor: { chain: string; tx: string } | null;
  metadata: { tagger_hash: string; gateway_version: string; started_at: number; signature: null };
}

export type RunStatus = 'running' | 'proving' | 'verified' | 'violated-blocked';
export interface Check { n: string; ok: boolean; d: string }
export interface VerifyResult { valid: boolean; reasons: string[]; checks: Check[]; policy: Certificate['policy'] | null; counts: Certificate['journal'] | null }

export interface ScriptStep { at: number; say: string; tool: string; args: Record<string, string | number>; result?: Record<string, string | number> }
export interface Scenario { id: string; title: string; blurb: string; user_request: string; session: { user_account: string }; started_at: number; steps: ScriptStep[] }

export interface RunData {
  run_id: string; scenario: Scenario; policy_id: string; policy_root: string;
  steps: StepRecord[]; at_ms: number[]; cert: Certificate;
}
export interface PublishedPolicy { policy: Policy; root: string; leaves: { index: number; id: string; text: string; leaf: string }[] }
