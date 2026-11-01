'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { demoApi, type PoaApi } from '@/lib/poa/api';
import type { PublishedPolicy, RunData, RunStatus, StepRecord } from '@/lib/poa/types';

export type Phase = 'running' | 'sealing' | 'proving' | 'certifying' | 'done';
export const PHASES: { id: Phase; label: string; ms: number }[] = [
  { id: 'sealing', label: 'Seal trace', ms: 700 }, { id: 'proving', label: 'Generate proof', ms: 2600 }, { id: 'certifying', label: 'Build certificate', ms: 700 },
];
export const runEnd = (r: RunData | undefined) => (r ? r.at_ms[r.at_ms.length - 1] + 900 : 0);
export const finalStatus = (r: RunData): RunStatus => (r.cert.journal.n_blocked ? 'violated-blocked' : 'verified');

/** Loads runs from the API boundary and owns replay (shared timeline) and the proof-progress state machine. */
export function usePoa(api: PoaApi = demoApi) {
  const [runs, setRuns] = useState<RunData[]>([]), [policies, setPolicies] = useState<PublishedPolicy[]>([]);
  const [loading, setLoading] = useState(true), [error, setError] = useState<string | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [t, setT] = useState(0), [playing, setPlaying] = useState(false), [speed, setSpeed] = useState(1), [sel, setSel] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>('running'), [elapsed, setElapsed] = useState(0), [skip, setSkip] = useState(false);
  const tRef = useRef(0); tRef.current = t;

  useEffect(() => {
    let dead = false;
    Promise.all([api.listRuns(), api.listPolicies()]).then(([r, p]) => { if (dead) return; setRuns(r); setPolicies(p); setRunId(r[0]?.run_id ?? null); setLoading(false); })
      .catch(e => { if (!dead) { setError(String(e?.message ?? e)); setLoading(false); } });
    return () => { dead = true; };
  }, [api]);

  const run = useMemo(() => runs.find(r => r.run_id === runId), [runs, runId]);
  const end = runEnd(run), atEnd = end > 0 && t >= end;
  const visible = useMemo<StepRecord[]>(() => (run ? run.steps.filter((_, k) => run.at_ms[k] <= t) : []), [run, t]);

  const select = useCallback((id: string, autoplay = true) => { setRunId(id); setT(0); tRef.current = 0; setSel(null); setSkip(false); setPlaying(autoplay); }, []);

  const auto = useRef(false);
  useEffect(() => { /* autoplay the first run once, unless the user prefers reduced motion */
    if (!run || auto.current) return; auto.current = true;
    if (!window.matchMedia('(prefers-reduced-motion:reduce)').matches) setPlaying(true);
  }, [run]);

  useEffect(() => {
    if (!playing || !end) return;
    let raf = 0, last = performance.now();
    const tick = (n: number) => {
      const nx = Math.min(end, tRef.current + (n - last) * speed); last = n; tRef.current = nx; setT(nx);
      if (nx >= end) { setPlaying(false); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, end]);

  /* Proof progress: seal -> generate (dev mode) -> certificate. Restarts when the replay leaves the end or the run changes. */
  useEffect(() => {
    if (!run || !atEnd) { setPhase('running'); setElapsed(0); return; }
    if (skip) { setPhase('done'); return; }
    const t0 = performance.now(), timers: ReturnType<typeof setTimeout>[] = [];
    const iv = setInterval(() => setElapsed(performance.now() - t0), 100);
    let acc = 0; setPhase('sealing');
    PHASES.forEach((p, k) => { acc += p.ms; timers.push(setTimeout(() => { if (k === PHASES.length - 1) { setPhase('done'); setElapsed(performance.now() - t0); clearInterval(iv); } else setPhase(PHASES[k + 1].id); }, acc)); });
    return () => { timers.forEach(clearTimeout); clearInterval(iv); };
  }, [run?.run_id, atEnd, skip]); // eslint-disable-line react-hooks/exhaustive-deps

  const status: RunStatus = !run ? 'running' : phase === 'running' ? 'running' : phase === 'done' ? finalStatus(run) : 'proving';
  const play = useCallback(() => { if (playing) { setPlaying(false); return; } if (atEnd) { setT(0); tRef.current = 0; setSkip(false); } setPlaying(true); }, [playing, atEnd]);
  const seek = useCallback((ms: number) => { setPlaying(false); setT(ms); tRef.current = ms; }, []);
  const openCert = useCallback((id: string) => { const r = runs.find(x => x.run_id === id); if (!r) return; const e = runEnd(r); setRunId(id); setT(e); tRef.current = e; setSel(null); setPlaying(false); setSkip(true); }, [runs]);
  const finalize = useCallback(() => { setPlaying(false); setT(end); tRef.current = end; }, [end]);
  return { api, runs, policies, loading, error, run, select, t, end, atEnd, playing, play, seek, finalize, openCert, replay: () => { setT(0); tRef.current = 0; setSkip(false); setPlaying(true); }, speed, setSpeed, sel, setSel, visible, phase, elapsed, status, skipProof: () => { finalize(); setSkip(true); } };
}
export type Poa = ReturnType<typeof usePoa>;
