'use client';
import { useCallback, useEffect, useState } from 'react';
import './poa.css';
import LiveRun from './LiveRun';
import PolicyScreen from './PolicyScreen';
import ProofScreen from './ProofScreen';
import RunsScreen from './RunsScreen';
import VerifierScreen from './VerifierScreen';
import { Empty, StatusTag } from './common';
import { usePoa } from './usePoa';

const SCREENS = [['live', 'Live run'], ['runs', 'Runs'], ['policy', 'Policy'], ['proof', 'Proof & certificate'], ['verifier', 'Verifier']] as const;
type Screen = typeof SCREENS[number][0];

/** Proof-of-Agent dashboard: the home page of the site. All data comes through the PoaApi boundary (PRD §12). */
export default function PoaDashboard() {
  const poa = usePoa(), [screen, setScreen] = useState<Screen>('live');
  const go = useCallback((s: Screen) => { setScreen(s); const u = new URL(window.location.href); u.searchParams.set('screen', s); window.history.replaceState(null, '', u); }, []);
  const [pendingRun, setPendingRun] = useState<string | null>(null);
  useEffect(() => { /* deep link from the certificate QR code: ?screen=verifier&run=<id> */
    const q = new URLSearchParams(window.location.search), s = q.get('screen') as Screen | null, id = q.get('run');
    if (s && SCREENS.some(x => x[0] === s)) setScreen(s);
    if (id) setPendingRun(id);
  }, []);
  const { runs, openCert } = poa;
  useEffect(() => { if (pendingRun && runs.some(r => r.run_id === pendingRun)) { openCert(pendingRun); setPendingRun(null); } }, [pendingRun, runs, openCert]);
  useEffect(() => { /* space toggles playback on the live screen */
    const k = (e: KeyboardEvent) => { if (screen === 'live' && e.key === ' ' && e.target === document.body) { e.preventDefault(); poa.play(); } };
    document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k);
  }, [screen, poa.play]); // eslint-disable-line react-hooks/exhaustive-deps
  const { run } = poa;
  const body = poa.loading ? <Empty>Loading runs and policy…</Empty> : poa.error ? <Empty><span className="err">Could not load data: {poa.error}</span></Empty> :
    screen === 'live' ? <LiveRun poa={poa} goto={go} /> : screen === 'runs' ? <RunsScreen poa={poa} goto={go} /> : screen === 'policy' ? <PolicyScreen poa={poa} /> : screen === 'proof' ? <ProofScreen poa={poa} goto={go} /> : <VerifierScreen poa={poa} />;
  return (
    <div className={'poa' + (screen === 'live' ? ' has-tl' : '')}>
      <header className="top">
        <div className="brand"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M9 1l8 8-8 8-8-8z" fill="#F15534" /></svg><b>PROOF-OF-AGENT</b></div>
        <span className="crumb">{run ? run.run_id + ' · ' + run.policy_id : ''}</span>
        {run && <StatusTag s={poa.status} />}<span className="sp" />
        <span className="pill sim" title="All data on this page is scripted demo data">DEMO · SIMULATED</span>
        <span className="pill" title="No gateway is connected; runs are replayed from the built-in demo">Gateway: demo data</span>
        <span className="pill sim" title="Proofs are dev-mode: no zero-knowledge receipt">Dev-mode proof</span>
      </header>
      <nav className="screens" role="tablist" aria-label="Dashboard screens">{SCREENS.map(([id, l]) => <button key={id} role="tab" aria-selected={screen === id} className={screen === id ? 'on' : ''} onClick={() => go(id)}>{l}</button>)}</nav>
      <div className="body">{body}</div>
      {screen === 'live' && run && (
        <footer className="tl">
          <button onClick={poa.play} aria-label="Play or pause">{poa.playing ? '❚❚' : '▶'}</button><button onClick={poa.replay} aria-label="Replay">↺</button>
          <input className="scrub" type="range" min={0} max={1000} value={Math.round(poa.t / (poa.end || 1) * 1000)} aria-label="Timeline" onChange={e => poa.seek(+e.target.value / 1000 * poa.end)} />
          <span className="m">{(poa.t / 1000).toFixed(1)} / {(poa.end / 1000).toFixed(1)}s</span>
          <select aria-label="Speed" value={poa.speed} onChange={e => poa.setSpeed(+e.target.value)}><option value={1}>1×</option><option value={2}>2×</option><option value={4}>4×</option></select>
        </footer>)}
    </div>
  );
}
