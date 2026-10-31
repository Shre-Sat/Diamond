'use client';
import { useMemo, useState } from 'react';
import type { DiamondSnapshot, DiamondEvent } from '@/types/event';
import { buildProcessTree } from '@/utils/eventParsers';
import ProcessNode from './process-tree/ProcessNode';
import ProcessTreeFilters, { defaultTreeFilter, filterTree } from './process-tree/ProcessTreeFilters';
import EventModal from './common/EventModal';
import { useTranslation } from '@/i18n/useTranslation';

export default function ProcessTreeView({ snap }: { snap: DiamondSnapshot }) {
  const { t } = useTranslation();
  const [f, setF] = useState(defaultTreeFilter);
  const [sel, setSel] = useState<DiamondEvent | null>(null);
  const tree = useMemo(() => filterTree(buildProcessTree(snap.events), f), [snap.events, f]);
  const prev = sel ? [...snap.events].reverse().find(e => e.pid === sel.pid && e.t < sel.t) : undefined;
  return (
    <div className="space-y-3">
      <ProcessTreeFilters value={f} onChange={setF} />
      {tree.length ? <ul>{tree.map(n => <ProcessNode key={n.pid} node={n} intent={snap.intent} onSelect={setSel} />)}</ul> : <p className="text-t3">{t('empty.events')}</p>}
      {sel && <EventModal event={sel} prev={prev} intent={snap.intent} onClose={() => setSel(null)} />}
    </div>
  );
}
