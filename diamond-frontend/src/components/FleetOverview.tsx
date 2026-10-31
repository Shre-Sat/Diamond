'use client';
import type { LiveOverview } from '@/types/event';
import { summarizeFleet } from '@/lib/fleetData';
import { useTranslation } from '@/i18n/useTranslation';

export default function FleetOverview({ overview }: { overview: LiveOverview | null }) {
  const { t } = useTranslation();
  if (!overview) return <section><h2 className="text-xs uppercase tracking-widest text-t3 mb-2">{t('fleet.title')}</h2><p className="text-t3 text-sm">No fleet data for this connection. Connect to a cloud controller or use the demo.</p></section>;
  const s = summarizeFleet(overview);
  return (
    <section>
      <h2 className="text-xs uppercase tracking-widest text-t3 mb-2">{t('fleet.title')} · {s.online}/{s.total} online · {t('fleet.capacity')} {s.capacityPct}%</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {overview.nodes.map(n => (
          <div key={n.id} className="border border-white/10 bg-s1 p-3">
            <div className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${n.online ? 'bg-ok' : 'bg-t3'}`} /><b className="font-medium">{n.name}</b><span className="ml-auto text-[10px] uppercase font-mono text-t3">{n.mode}</span></div>
            <div className="mt-2 grid grid-cols-4 text-xs text-t2 font-mono"><span>CPU {n.cpu}%</span><span>{n.memMb} MB</span><span>{n.agents} agents</span><span>{n.sessions} sess</span></div>
          </div>))}
      </div>
    </section>
  );
}
