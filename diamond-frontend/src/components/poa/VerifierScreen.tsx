'use client';
import { useCallback, useRef, useState } from 'react';
import { TAMPERS, tamper, type TamperKind } from '@/lib/poa/verifier';
import type { Certificate, VerifyResult } from '@/lib/poa/types';
import { HashChip, fmtTime } from './common';
import type { Poa } from './usePoa';

/** PRD §13.1 screen 5: drag-and-drop certificate, result card, technical details, Tamper test. */
export default function VerifierScreen({ poa }: { poa: Poa }) {
  const [cert, setCert] = useState<Certificate | null>(null), [source, setSource] = useState(''), [res, setRes] = useState<VerifyResult | null>(null), [note, setNote] = useState('');
  const [kind, setKind] = useState<TamperKind>('flip-byte'), [err, setErr] = useState(''), [over, setOver] = useState(false), [busy, setBusy] = useState(false), file = useRef<HTMLInputElement>(null);
  const run = useCallback(async (c: Certificate, n = '') => { setBusy(true); setNote(n); try { setRes(await poa.api.verify(c)); } catch (e) { setErr(String((e as Error).message)); } finally { setBusy(false); } }, [poa.api]);
  const load = async (f: File) => {
    setErr(''); setRes(null);
    try { const j = JSON.parse(await f.text()); if (!j?.policy || !j?.trace_root || !j?.journal) throw new Error('Not a Proof-of-Agent certificate'); setCert(j); setSource(f.name); await run(j); }
    catch (e) { setErr('Could not read certificate: ' + (e as Error).message); }
  };
  const useCurrent = async () => { if (!poa.run) return; setErr(''); setCert(poa.run.cert); setSource(poa.run.run_id + ' (current run)'); await run(poa.run.cert); };
  const doTamper = async () => { if (!cert) return; const label = TAMPERS.find(t => t.id === kind)!.label; await run(tamper(cert, kind), 'Verification copy modified: ' + label + '. The stored certificate is untouched.'); };
  return (
    <div className="page narrow">
      <h3>Verifier</h3>
      <p className="mut">Checks a certificate offline, with no backend call and without seeing private data.</p>
      <div className={'drop' + (over ? ' over' : '')} role="button" tabIndex={0} aria-label="Drop a certificate JSON file here or press Enter to choose one"
        onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={e => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) load(f); }}
        onClick={() => file.current?.click()} onKeyDown={e => { if (e.key === 'Enter') file.current?.click(); }}>
        Drag a certificate .json here, or click to choose<input ref={file} type="file" accept="application/json,.json" hidden onChange={e => { const f = e.target.files?.[0]; if (f) load(f); e.target.value = ''; }} />
      </div>
      <div className="bar"><button onClick={useCurrent} disabled={!poa.run}>Verify the current run&apos;s certificate</button>{source && <span className="mut m">Loaded: {source}</span>}</div>
      {err && <p className="err" role="alert">{err}</p>}
      {busy && <p className="mut">Verifying…</p>}
      {res && <div className={'badge' + (res.valid ? '' : ' bad')} role="status">{res.valid ? '✓ VALID' : '✕ INVALID'}
        <small>{res.policy ? `${res.policy.id} v${res.policy.version}` : ''}{res.counts ? ` · ${res.counts.n_steps} steps · ${res.counts.n_blocked} blocked` : ''}{cert ? ' · issued ' + fmtTime(cert.issued_at) : ''}</small></div>}
      {note && <p className="mut">{note}</p>}
      {res && !res.valid && <ul className="reasons">{res.reasons.map(r => <li key={r}>{r}</li>)}</ul>}
      {res && <details open={!res.valid}><summary>Technical details</summary>
        {res.checks.map(c => <div key={c.n} className={'chk ' + (c.ok ? 'p' : 'f')}><i>{c.ok ? '✓' : '✕'}</i><div>{c.n}<div className="m mut">{c.d}</div></div></div>)}
        {res.policy && cert && <dl className="kv wide" style={{ marginTop: 10 }}><dt>Policy root</dt><dd><HashChip h={res.policy.root} n={30} /></dd><dt>Trace root</dt><dd><HashChip h={cert.trace_root} n={30} /></dd></dl>}</details>}
      {cert && <div className="tamper"><h3>Tamper test</h3>
        <div className="bar"><select value={kind} onChange={e => setKind(e.target.value as TamperKind)} aria-label="Tamper type">{TAMPERS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select>
          <button className="danger" onClick={doTamper}>Tamper and re-verify</button><button onClick={() => run(cert)}>Verify original again</button></div></div>}
    </div>
  );
}
