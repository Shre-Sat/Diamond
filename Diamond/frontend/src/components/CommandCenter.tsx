'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import '@/components/poa/poa.css';
import PoaSphere, { type PoaSphereHandle, type SphereStep } from '@/components/poa/PoaSphere';
import { useSnapshot } from '@/lib/connection';

const post = (p: string, b?: unknown) => fetch(p, { method: 'POST', headers: { 'X-Diamond': '1' }, body: JSON.stringify(b ?? {}) }).then(r => r.json());
const card = 'border border-white/10 bg-deep p-4';
const lab = 'block text-[11px] text-t3 mb-1 mt-3';
const field = 'w-full bg-s1 border border-white/10 px-2 py-1.5 text-sm outline-none focus:border-accent';

export default function CommandCenter() {
  const { snap, status } = useSnapshot(), ev = snap?.events ?? [];
  const [agents, setAgents] = useState<Record<string, boolean>>({}), [agent, setAgent] = useState(''), [name, setName] = useState(''), [prompt, setPrompt] = useState('');
  const [files, setFiles] = useState<File[]>([]), [err, setErr] = useState(''), [sel, setSel] = useState<number | null>(null), [hot, setHot] = useState(false);
  const globe = useRef<PoaSphereHandle>(null), [log, setLog] = useState(false);
  useEffect(() => { fetch('/api/agents').then(r => r.json()).then((a: Record<string, boolean>) => { setAgents(a); setAgent(Object.keys(a).find(k => a[k]) ?? ''); }).catch(() => {}); }, []);

  const d = useMemo(() => {
    const own = ev.filter(e => e.note !== 'kernel'), net = own.filter(e => e.cat === 'net' && e.op === 'connect');
    const done = new Set(net.map(e => e.evidence).filter(Boolean)), files = new Map<string, string>();
    own.filter(e => e.cat === 'file').forEach(e => files.set(e.res ?? '', e.op));
    const steps: SphereStep[] = own.filter(e => (e.cat === 'net' && e.op === 'connect') || e.cat === 'file')
      .map((e, k) => ({ i: k + 1, tool: e.cat === 'net' ? e.dest ?? 'net' : 'files', decision: e.status.startsWith('denied') ? 'BLOCKED' : 'ALLOWED' }));
    const ended = ev.some(e => e.op === 'exit');
    return {
      steps, files, ended, ask: own.find(e => e.op === 'ask' && !done.has(e.evidence)),
      running: ev.some(e => e.note === 'session') && !ended, closed: ev.some(e => e.op === 'applied' || e.op === 'discarded'),
      allowed: new Set(net.filter(e => !e.status.startsWith('denied')).map(e => e.dest)).size, blocked: new Set(net.filter(e => e.status.startsWith('denied')).map(e => e.dest)).size,
      asked: own.filter(e => e.op === 'ask').length, kernel: ev.length - own.length, feed: own.filter(e => e.op !== 'answer' && (log || e.op !== 'stdout')).slice(-60).reverse(),
      answer: own.filter(e => e.op === 'answer').map(e => e.note ?? '').join('\n').trim(), folder: own.find(e => e.note === 'session')?.evidence ?? '',
    };
  }, [ev, log]);

  const start = async () => {
    setErr(''); const n = name.trim() || 'my-project';
    if (!agent || !prompt.trim()) return setErr('Pick an installed agent and describe the task.');
    for (const f of files) await fetch(`/api/upload?project=${encodeURIComponent(n)}&name=${encodeURIComponent(f.name)}`, { method: 'POST', headers: { 'X-Diamond': '1' }, body: f });
    setFiles([]); const r = await post('/api/start', { agent, name: n, prompt }); if (r.error) setErr(r.error);
  };
  const tone = d.ask ? '#E8B04B' : d.blocked ? '#F15534' : '#79C6A3';
  const stat = (v: number, l: string, c: string) => <div><b className="block text-2xl font-medium" style={{ color: c }}>{v}</b><span className="text-t3 text-xs">{l}</span></div>;
  const pick = d.steps.find(s => s.i === sel);

  return (
    <div className="grid gap-4 p-4 lg:grid-cols-[330px_minmax(0,1fr)_380px]">
      <section className={card} aria-label="Start an agent">
        <h2 className="text-base mb-1">Start an agent</h2><p className="text-t3 text-xs">Runs inside the sandbox. Nothing is saved until you approve it.</p>
        <span className={lab}>Agent</span>
        <div className="flex gap-2 flex-wrap">{Object.keys(agents).map(k => <button key={k} disabled={!agents[k]} title={agents[k] ? '' : 'Not installed'} onClick={() => setAgent(k)}
          className={'px-3 py-1 text-sm border disabled:opacity-30 ' + (agent === k ? 'bg-accent border-accent text-white' : 'border-white/15 text-t2')}>{k}</button>)}</div>
        <label className={lab} htmlFor="nm">Project name</label><input id="nm" className={field} value={name} onChange={e => setName(e.target.value)} placeholder="birthday-site" />
        <label className={lab} htmlFor="pr">What should it do?</label><textarea id="pr" rows={4} className={field} value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Make a birthday website using the picture I attached." />
        <span className={lab}>Files it may use</span>
        <label className={'block border border-dashed p-4 text-center text-xs text-t2 cursor-pointer ' + (hot ? 'border-accent' : 'border-white/20')}
          onDragOver={e => { e.preventDefault(); setHot(true); }} onDragLeave={() => setHot(false)} onDrop={e => { e.preventDefault(); setHot(false); setFiles(f => [...f, ...Array.from(e.dataTransfer.files)]); }}>
          Drop photos or documents here<input type="file" multiple hidden onChange={e => setFiles(f => [...f, ...Array.from(e.target.files ?? [])])} />
          {files.length > 0 && <span className="block mt-1 text-tx break-all">{files.map(f => f.name).join(', ')}</span>}</label>
        <button onClick={start} disabled={d.running} className="w-full mt-4 bg-accent text-white py-2 text-sm disabled:opacity-40">{d.running ? 'Agent running…' : 'Start in sandbox'}</button>
        {err && <p className="text-[#F15534] text-xs mt-2">{err}</p>}
        {d.running && <button onClick={() => post('/api/stop')} className="w-full mt-2 border border-white/15 text-t2 py-1.5 text-sm">Stop agent</button>}
      </section>

      <section className={card + ' min-w-0'} aria-label="Session sphere">
        <div className="flex items-center gap-3 mb-2">
          <span className="w-2 h-2 rounded-full" style={{ background: tone }} />
          <b className="text-sm font-medium">{d.running ? 'Protecting ' + (snap?.agent ?? '') : d.ended ? 'Session finished' : 'Ready'}</b>
          <span className="text-t3 text-xs ml-auto">{status === 'live' ? 'Connected' : status === 'offline' ? 'Offline: is Diamond running?' : 'Connecting…'}{d.kernel > 0 && ` · ${d.kernel} kernel events`}</span>
        </div>
        <div className="flex gap-8 mb-1">{stat(d.allowed, 'Sites allowed', '#79C6A3')}{stat(d.blocked, 'Sites blocked', '#F15534')}{stat(d.asked, 'Asked you', '#E8B04B')}{stat(d.files.size, 'Files changed', '#F4F2EF')}</div>
        <div className="relative h-[460px] overflow-hidden [&_.poa-sphere]:absolute [&_.poa-sphere]:inset-0 [&_.poa-sphere]:overflow-hidden [&_canvas]:block [&_.lab]:absolute [&_.lab]:text-[10px] [&_.lab]:text-t2 [&_.lab]:pointer-events-none [&_.lab]:whitespace-nowrap [&_.lab]:translate-x-2 [&_.lab]:-translate-y-1.5"><PoaSphere ref={globe} steps={d.steps} selected={sel} sealed={d.ended} showLabels showConns onPick={setSel} />
          {d.steps.length === 0 && <p className="absolute inset-0 grid place-items-center text-t3 text-sm pointer-events-none">Every connection and file change will appear on the sphere.</p>}</div>
        <p className="text-xs text-t3 mt-1 min-h-4">{pick ? `Step ${pick.i} · ${pick.tool} · ${pick.decision === 'BLOCKED' ? 'blocked' : 'allowed'}` : 'Drag to rotate, scroll to zoom, click a node. Green is allowed, red is blocked.'}</p>
        {(d.answer || d.files.size > 0) && <div className="mt-3 border border-white/10 bg-s1 p-4" aria-label="Result">
          <h3 className="text-sm mb-2">Result</h3>
          {d.answer && <p className="whitespace-pre-wrap text-sm leading-relaxed">{d.answer}</p>}
          {d.files.size > 0 && <ul className="mt-3 text-sm space-y-1">{Array.from(d.files).filter(([, o]) => o !== 'deleted').sort(([a], [b]) => +/\.html?$/i.test(b) - +/\.html?$/i.test(a)).slice(0, 25).map(([p, o]) =>
            <li key={p} className="flex gap-3"><em className="not-italic text-t3 w-16 shrink-0">{o}</em><span className="break-all min-w-0">{p}</span>
              {/\.(html?|png|jpe?g|gif|webp|svg|pdf|txt|md)$/i.test(p) && <a className="text-accent ml-auto shrink-0" href={'http://localhost:8789/' + p.split('/').map(encodeURIComponent).join('/')} target="_blank" rel="noreferrer">Open</a>}</li>)}</ul>}
          {d.files.size > 25 && <p className="text-xs text-t3 mt-1">+ {d.files.size - 25} more files</p>}
          {d.folder && d.closed && <p className="text-xs text-t3 mt-3 break-all">Saved to {d.folder}</p>}
        </div>}
      </section>

      <section className={card + ' min-w-0'} aria-label="Live activity">
        <div className="flex items-center mb-2"><h2 className="text-base">Live activity</h2><label className="ml-auto text-xs text-t3 flex gap-1 items-center"><input type="checkbox" checked={log} onChange={e => setLog(e.target.checked)} />Agent log</label></div>
        <div className="max-h-[470px] overflow-auto border-l border-white/10 pl-3 space-y-1">
          {d.feed.length === 0 && <p className="text-t3 text-sm">Nothing running yet.</p>}
          {d.feed.map(e => {
            const bad = e.status.startsWith('denied'), tag = e.op === 'ask' ? 'Asked' : e.cat === 'net' ? (bad ? 'Blocked' : 'Allowed') : e.cat === 'file' ? 'File ' + e.op : e.op === 'stdout' ? 'Agent' : e.op === 'exit' ? 'Done' : e.op === 'start' ? 'Started' : 'Info';
            const c = e.op === 'ask' ? '#E8B04B' : bad ? '#F15534' : e.cat === 'net' || e.cat === 'file' ? '#79C6A3' : '#8b8680';
            return <div key={e.id} className="flex gap-2 text-[13px] leading-snug"><span className="w-20 shrink-0" style={{ color: c }}>{tag}</span>
              <span className={'break-words min-w-0 ' + (e.op === 'stdout' ? 'font-mono text-xs text-t2' : '')}>{e.dest ?? e.res ?? e.note ?? e.name}{bad && e.note ? ': ' + e.note : ''}</span></div>;
          })}
        </div>
        {d.ended && !d.closed && d.files.size > 0 && <div className="mt-3 border border-white/10 bg-s1 p-3">
          <h3 className="text-sm mb-1">Review changes</h3>
          <ul className="max-h-28 overflow-auto text-xs text-t2 mb-2">{Array.from(d.files).map(([p, o]) => <li key={p}><em className="not-italic text-t3 mr-2">{o}</em>{p}</li>)}</ul>
          <button onClick={() => post('/api/apply')} className="bg-accent text-white px-3 py-1 text-sm mr-2">Keep changes</button>
          <button onClick={() => post('/api/discard')} className="border border-white/15 text-t2 px-3 py-1 text-sm">Discard</button></div>}
      </section>

      {d.ask && <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-sm">
        <div className="w-[min(440px,92vw)] bg-deep border border-white/15 border-t-4 border-t-[#E8B04B] p-6">
          <h3 className="text-lg mb-1">Allow this connection?</h3><p className="text-t2 text-sm mb-5">{d.ask.note}. It is not on the safe list.</p>
          <div className="flex gap-3"><button onClick={() => post('/api/decision', { id: d.ask!.evidence, allow: false })} className="flex-1 border border-white/15 text-[#F15534] py-2">Deny</button>
            <button onClick={() => post('/api/decision', { id: d.ask!.evidence, allow: true })} className="flex-1 bg-accent text-white py-2">Allow once</button></div></div></div>}
    </div>
  );
}
