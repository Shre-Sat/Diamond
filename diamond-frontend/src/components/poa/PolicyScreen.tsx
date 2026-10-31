'use client';
import { useState } from 'react';
import { HashChip, DecisionTag, Empty, RuleChip } from './common';
import type { DryRunResult } from '@/lib/poa/api';
import type { Poa } from './usePoa';

const LABELS = ['PII.SSN', 'PII.AADHAAR', 'PII.PAN', 'PII.PHONE', 'PII.EMAIL', 'PHI.RECORD', 'FIN.ACCOUNT', 'SECRET.APIKEY'];

/** PRD §13.1 screen 2: rules list, root hash chip, test-a-call sandbox (FR-PE-6 dry run). */
export default function PolicyScreen({ poa }: { poa: Poa }) {
  const pub = poa.policies[0];
  const [tool, setTool] = useState('transfer_funds'), [amount, setAmount] = useState('60000'), [from, setFrom] = useState('acct-7731'), [to, setTo] = useState('attacker@evil.com'), [body, setBody] = useState('');
  const [labels, setLabels] = useState<string[]>([]), [verified, setVerified] = useState(true), [prior, setPrior] = useState(0), [res, setRes] = useState<DryRunResult | null>(null), [busy, setBusy] = useState(false), [json, setJson] = useState(false);
  if (!pub) return <Empty>No policy loaded.</Empty>;
  const p = pub.policy;
  const test = async () => {
    setBusy(true);
    const args: Record<string, string | number> = tool === 'transfer_funds' ? { amount: Number(amount), from, to: 'acct-0042' } : tool === 'send_email' ? { to, subject: 'test', body } : tool === 'get_account' ? { id: 'acct-7731' } : { x: 'y' };
    try { setRes(await poa.api.evaluate(p.policy_id, { tool, args, extra_labels: labels, verified_identity: verified, prior_transfers: prior })); } finally { setBusy(false); }
  };
  return (
    <div className="page two">
      <section>
        <h3>Policy</h3>
        <dl className="kv wide"><dt>ID</dt><dd className="m">{p.policy_id}</dd><dt>Version</dt><dd className="m">v{p.version}</dd><dt>Root P</dt><dd><HashChip h={pub.root} n={30} title={pub.root} /></dd>
          <dt>History</dt><dd className="mut">Only v{p.version} is available from the demo. Version history needs the gateway&apos;s policy registry (FR-PE-4).</dd></dl>
        <h3 style={{ marginTop: 18 }}>Rules ({pub.leaves.length}) · Merkle leaves H(rule_id ‖ canonical_rule)</h3>
        <table className="tbl"><thead><tr><th>#</th><th>Rule</th><th>Meaning</th><th>Leaf</th></tr></thead><tbody>
          {pub.leaves.map(l => <tr key={l.id}><td className="m mut">{l.index}</td><td><RuleChip id={l.id} /></td><td>{l.text}</td><td><HashChip h={'0x' + l.leaf} n={10} /></td></tr>)}
        </tbody></table>
        <button style={{ marginTop: 12 }} onClick={() => setJson(v => !v)} aria-expanded={json}>{json ? 'Hide' : 'Show'} policy JSON</button>
        {json && <pre>{JSON.stringify(p, null, 2)}</pre>}
      </section>
      <section>
        <h3>Test a call (dry run)</h3>
        <p className="mut">Evaluates one call against this policy with the same evaluator the gateway and verifier use. Nothing is executed.</p>
        <div className="form">
          <label>Tool<select value={tool} onChange={e => setTool(e.target.value)}>{[...Object.keys(p.tools), 'delete_database'].map(t => <option key={t}>{t}</option>)}</select></label>
          {tool === 'transfer_funds' && <><label>Amount<input value={amount} inputMode="numeric" onChange={e => setAmount(e.target.value.replace(/\D/g, ''))} /></label>
            <label>From account<select value={from} onChange={e => setFrom(e.target.value)}><option value="acct-7731">acct-7731 (session)</option><option value="acct-9999">acct-9999 (other)</option></select></label></>}
          {tool === 'send_email' && <><label>Recipient<input value={to} onChange={e => setTo(e.target.value)} /></label><label>Body<input value={body} placeholder="optional; the tagger scans it" onChange={e => setBody(e.target.value)} /></label></>}
          <fieldset><legend>Extra input labels</legend>{LABELS.map(l => <label key={l} className="chk"><input type="checkbox" checked={labels.includes(l)} onChange={e => setLabels(x => e.target.checked ? [...x, l] : x.filter(y => y !== l))} />{l}</label>)}</fieldset>
          <label className="chk"><input type="checkbox" checked={verified} onChange={e => setVerified(e.target.checked)} />verify_identity already allowed earlier</label>
          <label>Transfers already executed<input type="number" min={0} max={9} value={prior} onChange={e => setPrior(Math.max(0, +e.target.value))} /></label>
          <button className="primary" onClick={test} disabled={busy}>{busy ? 'Evaluating…' : 'Evaluate'}</button>
        </div>
        {res && <div className={'result ' + res.decision} role="status"><DecisionTag d={res.decision} /> {res.rule && <RuleChip id={res.rule} />}<div>{res.reason}</div>
          {res.all_rules.length > 1 && <div className="mut">All violated rules: {res.all_rules.join(', ')}</div>}<div className="mut">Input labels detected: {res.labels.length ? res.labels.join(', ') : 'none'}</div></div>}
      </section>
    </div>
  );
}
