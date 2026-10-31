import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { demoApi } from './api';
import { BANKING_POLICY, compilePolicy, publishPolicy, violations } from './policy';
import { tagInputs } from './tagger';
import { TAMPERS, tamper, verifyCertificate } from './verifier';

const runs = () => demoApi.listRuns();
const pubs = () => demoApi.listPolicies();

test('PRD §16 demo run: 9 steps, 1 blocked by F1, COMPLIANT', async () => {
  const r = (await runs()).find(x => x.scenario.id === 'prd-demo')!;
  assert.equal(r.steps.length, 9);
  assert.deepEqual(r.steps.filter(s => s.decision === 'BLOCKED').map(s => [s.i, s.violated_rule]), [[7, 'F1']]);
  assert.deepEqual(r.cert.journal, { n_steps: 9, n_allowed: 8, n_blocked: 1, verdict: 'COMPLIANT' });
});
test('adversarial suite blocks one attack per rule class', async () => {
  const r = (await runs()).find(x => x.scenario.id === 'adversarial')!;
  assert.deepEqual(r.steps.filter(s => s.decision === 'BLOCKED').map(s => s.violated_rule), ['O1', 'A1', 'T1', 'F2', 'A2', 'S1', 'L2', 'DEFAULT_DENY']);
});
test('benign run has no blocked steps', async () => {
  const r = (await runs()).find(x => x.scenario.id === 'benign')!;
  assert.equal(r.cert.journal.n_blocked, 0);
});
test('every honest certificate verifies', async () => {
  for (const r of await runs()) { const v = await demoApi.verify(r.cert); assert.equal(v.valid, true, r.run_id + ' ' + v.reasons.join('|')); }
});
test('every tamper kind is caught on every run that it applies to', async () => {
  for (const r of await runs()) for (const k of TAMPERS) {
    if (k.id === 'hide-blocked' && r.cert.journal.n_blocked === 0) continue; // nothing to hide
    const v = await verifyCertificate(tamper(r.cert, k.id), await pubs());
    assert.equal(v.valid, false, `${r.run_id} / ${k.id} should fail`);
  }
});
test('tamper works on a copy', async () => {
  const r = (await runs())[0], before = JSON.stringify(r.cert); tamper(r.cert, 'flip-byte'); assert.equal(JSON.stringify(r.cert), before);
});
test('labels: regex detection and value-hash propagation, routing fields ignored', async () => {
  assert.deepEqual(await tagInputs({ to: 'a@b.example', body: 'Aadhaar 1234 5678 9012' }, new Map()), ['PII.AADHAAR']);
  const r = (await runs()).find(x => x.scenario.id === 'prd-demo')!;
  assert.ok(r.steps[5].input_labels.includes('FIN.ACCOUNT'));
  assert.deepEqual(r.steps[1].output_labels, ['FIN.ACCOUNT']);
});
test('policy root is deterministic and changes when a rule changes', async () => {
  const a = await publishPolicy(BANKING_POLICY), b = await publishPolicy(JSON.parse(JSON.stringify(BANKING_POLICY)));
  assert.equal(a.root, b.root);
  const c = await publishPolicy({ ...BANKING_POLICY, limits: { max_steps: 64, max_transfers: 4 } });
  assert.notEqual(a.root, c.root);
  assert.ok(compilePolicy(BANKING_POLICY).some(r => r.id === 'F1'));
});
test('dry run (FR-PE-6) names the rule', async () => {
  const bad = await demoApi.evaluate('banking-agent-v1', { tool: 'transfer_funds', args: { amount: 60000, from: 'acct-7731', to: 'acct-0042' }, verified_identity: true });
  assert.equal(bad.rule, 'A1');
  const ok = await demoApi.evaluate('banking-agent-v1', { tool: 'transfer_funds', args: { amount: 100, from: 'acct-7731', to: 'acct-0042' }, verified_identity: true });
  assert.equal(ok.decision, 'ALLOWED');
  assert.ok(violations(BANKING_POLICY, { i: 1, tool_id: 'nope', args_features: { amount: null, sink: null, domain_hash: null, from_session: null }, input_labels: [] }, []).includes('DEFAULT_DENY'));
});
