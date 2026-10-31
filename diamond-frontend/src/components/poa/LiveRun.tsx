'use client';
import { useRef, useState } from 'react';
import { ruleText } from '@/lib/poa/policy';
import PoaSphere, { type PoaSphereHandle } from './PoaSphere';
import { DecisionTag, Empty, HashChip, LabelChips, RuleChip, featureLine, fmtTime } from './common';
import type { Poa } from './usePoa';

/** PRD §13.1 screen 1: left = agent steps, right = gateway decisions streaming in (green allowed, red blocked with rule ID). */
export default function LiveRun({ poa, goto }: { poa: Poa; goto: (s: 'proof') => void }) {
  const { run, visible, sel, setSel, atEnd } = poa, sphere = useRef<PoaSphereHandle>(null);
  const [showL, setShowL] = useState(true), [showC, setShowC] = useState(true);
  if (!run) return <Empty>No run selected.</Empty>;
  const policy = poa.policies[0]?.policy, blocked = visible.filter(s => s.decision === 'BLOCKED');
  const cur = visible.find(s => s.i === sel) ?? null;
  const sc = run.scenario;
  return (
    <div className="live">
      <section className="pane agent" aria-label="Agent steps">
        <h3>Agent</h3>
        <div className="msg user"><span className="who">User</span>{sc.user_request}</div>
        {visible.map(s => {
          const k = s.i - 1, say = sc.steps[k].say, bad = s.decision === 'BLOCKED';
          return (
            <div key={s.i} className="turn" onClick={() => setSel(s.i)}>
              <div className="msg agentmsg"><span className="who">Agent</span>{say}</div>
              <div className={'call' + (sel === s.i ? ' sel' : '') + (bad ? ' bad' : '')} tabIndex={0} role="button" onKeyDown={e => { if (e.key === 'Enter') setSel(s.i); }}>
                <span className="m">#{s.i} {s.tool_id}</span><span className="mut m"> args </span><HashChip h={s.args_hash} n={10} />
                <div className="mut">{featureLine(s)}</div>
              </div>
              <div className={'msg gw ' + (bad ? 'bad' : 'ok')}><span className="who">Gateway</span>{bad ? <>Refused by <RuleChip id={s.violated_rule} />. {policy ? ruleText(policy, s.violated_rule) : ''} The call was not executed.</> : 'Executed.'}</div>
            </div>
          );
        })}
        {!visible.length && <span className="mut">Waiting for the agent&apos;s first call…</span>}
        {atEnd && <button className="primary" onClick={() => goto('proof')}>Finalize → generate proof</button>}
      </section>

      <main className="stage">
        <div className="tools"><button onClick={() => sphere.current?.reset()}>Reset</button><button disabled={!sel} onClick={() => sel && sphere.current?.focus(sel)}>Focus</button>
          <button aria-pressed={showL} onClick={() => setShowL(v => !v)}>Labels</button><button aria-pressed={showC} onClick={() => setShowC(v => !v)}>Connections</button></div>
        <PoaSphere ref={sphere} steps={visible.map(s => ({ i: s.i, tool: s.tool_id, decision: s.decision }))} selected={sel} sealed={poa.phase === 'done'} showLabels={showL} showConns={showC} onPick={setSel} />
        <div className="stats">
          <div><b>{visible.length}</b>calls gated</div><div><b>{visible.length - blocked.length}</b>allowed</div>
          <div className={blocked.length ? 'hot' : ''}><b>{blocked.length}</b>blocked</div>
          <div className={blocked.some(s => s.input_labels.some(l => l.startsWith('PII') || l.startsWith('SECRET'))) ? 'hot' : ''}><b>{blocked.filter(s => s.input_labels.some(l => l.startsWith('PII') || l.startsWith('SECRET'))).length}</b>sensitive flows stopped</div>
        </div>
      </main>

      <aside className="side">
        <section><h3>Gateway decisions</h3>
          {visible.length ? visible.slice().reverse().map(s => (
            <div key={s.i} className={'row' + (sel === s.i ? ' sel' : '')} tabIndex={0} role="button" onClick={() => setSel(s.i)} onKeyDown={e => { if (e.key === 'Enter') setSel(s.i); }}>
              <span className="m mut">#{s.i}</span><span className="m grow">{s.tool_id}</span><RuleChip id={s.violated_rule} /><DecisionTag d={s.decision} />
            </div>)) : <span className="mut">No calls yet.</span>}
        </section>
        <section>{!cur ? <><h3>Inspector</h3><span className="mut">Select a step on the sphere, in the agent pane or in the list.</span></> : <>
          <h3>Step {cur.i} · trace record</h3>
          <dl className="kv"><dt>Tool</dt><dd className="m">{cur.tool_id}</dd><dt>Decision</dt><dd><DecisionTag d={cur.decision} /></dd>
            <dt>Rule</dt><dd>{cur.violated_rule ? <><RuleChip id={cur.violated_rule} /> {policy && ruleText(policy, cur.violated_rule)}</> : <span className="mut">No rule violated</span>}</dd>
            <dt>Input labels</dt><dd><LabelChips labels={cur.input_labels} /></dd><dt>Output labels</dt><dd><LabelChips labels={cur.output_labels} /></dd>
            <dt>Features</dt><dd className="m">{featureLine(cur)}</dd><dt>Args hash</dt><dd><HashChip h={cur.args_hash} n={18} /></dd>
            <dt>Output hash</dt><dd><HashChip h={cur.output_hash} n={18} /></dd><dt>Chain h<sub>{cur.i}</sub></dt><dd><HashChip h={cur.chain_hash} n={18} /></dd><dt>Time</dt><dd className="m">{fmtTime(cur.ts)}</dd></dl>
          <p className="mut note">Raw arguments and outputs stay in the private witness. Only hashes, label chips and bucketed features are shown.</p></>}
        </section>
      </aside>
    </div>
  );
}
