'use client';
import { useMemo, useState } from 'react';
import { DecisionTag, Empty, HashChip, RuleChip, StatusTag, fmtTime } from './common';
import { finalStatus, type Poa } from './usePoa';

/** PRD §8.7 / §13.1 screen 6: run table with status, filter by policy, run detail with decisions (hashes only). */
export default function RunsScreen({ poa, goto }: { poa: Poa; goto: (s: 'live' | 'proof') => void }) {
  const [pol, setPol] = useState('all'), [open, setOpen] = useState<string | null>(null);
  const rows = useMemo(() => poa.runs.filter(r => pol === 'all' || r.policy_id === pol), [poa.runs, pol]);
  const blocked = poa.runs.reduce((n, r) => n + r.cert.journal.n_blocked, 0), calls = poa.runs.reduce((n, r) => n + r.cert.journal.n_steps, 0);
  if (!poa.runs.length) return <Empty>No runs yet. Start a run through the gateway (POST /v1/runs).</Empty>;
  return (
    <div className="page">
      <div className="tiles"><div><b>{poa.runs.length}</b>runs</div><div><b>{calls}</b>calls gated</div><div className="hot"><b>{blocked}</b>violating calls blocked</div><div><b>{poa.runs.length}</b>certificates issued</div></div>
      <div className="bar"><label>Policy <select value={pol} onChange={e => setPol(e.target.value)}><option value="all">All policies</option>{poa.policies.map(p => <option key={p.policy.policy_id} value={p.policy.policy_id}>{p.policy.policy_id} v{p.policy.version}</option>)}</select></label><span className="mut">Runs are scripted demo data (DEMO · SIMULATED).</span></div>
      <table className="tbl"><thead><tr><th>Run</th><th>Scenario</th><th>Policy</th><th>Status</th><th>Steps</th><th>Blocked</th><th>Started</th></tr></thead><tbody>
        {rows.map(r => {
          const cur = poa.run?.run_id === r.run_id, st = cur ? poa.status : finalStatus(r), isOpen = open === r.run_id;
          return [
            <tr key={r.run_id} className={'clickable' + (cur ? ' sel' : '')} tabIndex={0} onClick={() => setOpen(isOpen ? null : r.run_id)} onKeyDown={e => { if (e.key === 'Enter') setOpen(isOpen ? null : r.run_id); }} aria-expanded={isOpen}>
              <td className="m">{r.run_id}</td><td>{r.scenario.title}</td><td className="m">{r.policy_id} v{r.cert.policy.version}</td><td><StatusTag s={st} /></td><td className="m">{r.cert.journal.n_steps}</td><td className="m">{r.cert.journal.n_blocked}</td><td className="m">{fmtTime(r.cert.metadata.started_at)}</td></tr>,
            isOpen && <tr key={r.run_id + 'd'} className="detail"><td colSpan={7}>
              <p className="mut">{r.scenario.blurb}</p>
              <div className="bar"><button onClick={() => { poa.select(r.run_id); goto('live'); }}>Replay live</button><button onClick={() => { poa.openCert(r.run_id); goto('proof'); }}>Open certificate</button><span className="mut m">trace root <HashChip h={r.cert.trace_root} n={18} /></span></div>
              <table className="tbl inner"><thead><tr><th>#</th><th>Tool</th><th>Decision</th><th>Rule</th><th>Args hash</th><th>Chain hash</th></tr></thead><tbody>
                {r.steps.map(s => <tr key={s.i}><td className="m">{s.i}</td><td className="m">{s.tool_id}</td><td><DecisionTag d={s.decision} /></td><td><RuleChip id={s.violated_rule} /></td><td><HashChip h={s.args_hash} /></td><td><HashChip h={s.chain_hash} /></td></tr>)}
              </tbody></table></td></tr>,
          ];
        })}
      </tbody></table>
      <h3 style={{ marginTop: 22 }}>Policies</h3>
      {poa.policies.map(p => <div key={p.policy.policy_id} className="row static"><span className="m grow">{p.policy.policy_id} v{p.policy.version}</span><span className="mut">{p.leaves.length} rules</span><HashChip h={p.root} n={16} /></div>)}
    </div>
  );
}
