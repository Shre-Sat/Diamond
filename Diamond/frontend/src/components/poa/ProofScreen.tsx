'use client';
import { useMemo } from 'react';
import { HashChip, Qr, downloadJson, fmtTime } from './common';
import { PHASES, type Poa } from './usePoa';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

/** PRD §13.1 screens 3 + 4: proof-progress stepper, then the certificate page (badge, policy name + hash, counts, QR, download). */
export default function ProofScreen({ poa, goto }: { poa: Poa; goto: (s: 'verifier' | 'live') => void }) {
  const { run, phase, elapsed } = poa;
  const link = useMemo(() => (run && typeof window !== 'undefined' ? `${window.location.origin}${basePath}/?screen=verifier&run=${run.run_id}` : ''), [run]);
  if (!run) return <div className="empty">No run selected.</div>;
  const c = run.cert, done = phase === 'done', idx = PHASES.findIndex(p => p.id === phase);
  if (phase === 'running') return (
    <div className="page narrow"><h3>Proof progress</h3><p>The run <span className="m">{run.run_id}</span> is still in progress. A certificate can only be built after the trace is sealed.</p>
      <div className="bar"><button className="primary" onClick={poa.finalize}>Finalize run and generate proof</button><button onClick={() => goto('live')}>Back to live run</button></div></div>);
  return (
    <div className="page narrow">
      <h3>Proof progress</h3>
      <ol className="stepper" aria-label="Proof progress">{PHASES.map((p, k) => { const st = done || k < idx ? 'done' : k === idx ? 'active' : 'todo'; return <li key={p.id} className={st}><i>{st === 'done' ? '✓' : k + 1}</i>{p.label}</li>; })}</ol>
      <p className="mut m" aria-live="polite">{done ? 'Certificate ready' : 'Working…'} · elapsed {(elapsed / 1000).toFixed(1)}s</p>
      <div className="banner">Dev-mode proof (PRD FR-PV-6). The prover is not connected, so this certificate embeds the public trace instead of a zero-knowledge receipt. It is simulated and carries no cryptographic guarantee.
        {!done && <> <button onClick={poa.skipProof}>Use pre-generated proof</button></>}</div>
      {done && <>
        <div className="badge" role="status">✓ COMPLIANT<small>{c.journal.n_steps} steps · {c.journal.n_allowed} allowed · {c.journal.n_blocked} blocked</small></div>
        <div className="certgrid">
          <dl className="kv wide"><dt>Run</dt><dd className="m">{c.run_id}</dd><dt>Policy</dt><dd className="m">{c.policy.id} v{c.policy.version}</dd><dt>Policy root P</dt><dd><HashChip h={c.policy.root} n={30} /></dd>
            <dt>Trace root R</dt><dd><HashChip h={c.trace_root} n={30} /></dd><dt>Issued</dt><dd className="m">{fmtTime(c.issued_at)}</dd><dt>Guest image</dt><dd><HashChip h={c.guest_image_id} n={14} /> <span className="tag sim">Dev</span></dd>
            <dt>Tagger</dt><dd><HashChip h={c.metadata.tagger_hash} n={14} /></dd><dt>Anchor</dt><dd className="mut">Not anchored (optional, PRD P2)</dd><dt>Signature</dt><dd className="mut">Not signed in the demo (Ed25519 needs the gateway key)</dd></dl>
          {link && <div><Qr text={link} /><div className="mut m" style={{ marginTop: 6 }}>Scan to open the verifier</div></div>}
        </div>
        <div className="bar"><button className="primary" onClick={() => downloadJson(`certificate-${c.run_id}.json`, c)}>Download certificate (JSON)</button><button onClick={() => goto('verifier')}>Verify this certificate →</button></div>
        <p className="mut note">This certificate shows that no policy-violating action was executed in the recorded trace, and that the trace is complete and untampered. It does not show that the model reasoned correctly or never hallucinated.</p>
        <details><summary>Certificate JSON</summary><pre>{JSON.stringify({ ...c, proof: c.proof.slice(0, 48) + '… (' + c.proof.length + ' chars)' }, null, 2)}</pre></details>
      </>}
    </div>
  );
}
