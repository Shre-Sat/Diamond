'use client';
import { useState } from 'react';
import type { DiamondSnapshot } from '@/types/event';
import SessionConsole from './SessionConsole';
import ProcessTreeView from './ProcessTreeView';
import SessionAnalysis from './SessionAnalysis';
import { useTranslation } from '@/i18n/useTranslation';

const TABS = [['conversation', 'session.conversation'], ['tree', 'session.tree'], ['analysis', 'session.analysis']] as const;
export default function SessionWorkspace({ snap }: { snap: DiamondSnapshot }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('conversation');
  return (
    <div>
      <div role="tablist" className="flex gap-1 mb-3 border-b border-white/10">
        {TABS.map(([k, label]) => <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`px-3 py-1.5 text-sm border-b-2 ${tab === k ? 'border-accent text-tx' : 'border-transparent text-t2'}`}>{t(label)}</button>)}
      </div>
      {tab === 'conversation' && <SessionConsole snap={snap} />}
      {tab === 'tree' && <ProcessTreeView snap={snap} />}
      {tab === 'analysis' && <SessionAnalysis snap={snap} />}
    </div>
  );
}
