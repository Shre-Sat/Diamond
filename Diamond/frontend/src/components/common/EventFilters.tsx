'use client';
import type { Cat, Severity } from '@/types/event';
import type { EventQuery } from '@/utils/filterUtils';
import { useTranslation } from '@/i18n/useTranslation';

const CATS: [Cat, string][] = [['proc', 'Process'], ['file', 'File'], ['net', 'Network'], ['policy', 'Policy']];
const SEVS: Severity[] = ['info', 'warn', 'critical'];
const toggle = <T,>(s: Set<T>, v: T) => { const n = new Set(s); if (n.has(v)) n.delete(v); else n.add(v); return n; };

export default function EventFilters({ query, onChange }: { query: EventQuery; onChange: (q: EventQuery) => void }) {
  const { t } = useTranslation();
  const chip = (on: boolean) => `px-2 py-1 text-xs border border-white/10 ${on ? 'text-tx bg-s2' : 'text-t3 opacity-60'}`;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {CATS.map(([c, l]) => <button key={c} aria-pressed={query.cats.has(c)} className={chip(query.cats.has(c))} onClick={() => onChange({ ...query, cats: toggle(query.cats, c) })}>{l}</button>)}
      <span className="w-px h-5 bg-white/10" />
      {SEVS.map(s => <button key={s} aria-pressed={query.severities.has(s)} className={chip(query.severities.has(s))} onClick={() => onChange({ ...query, severities: toggle(query.severities, s) })}>{s}</button>)}
      <input value={query.q} onChange={e => onChange({ ...query, q: e.target.value })} placeholder={t('filter.search')} aria-label={t('filter.search')}
        className="ml-auto bg-s1 border border-white/10 px-2 py-1 text-sm w-48" />
    </div>
  );
}
