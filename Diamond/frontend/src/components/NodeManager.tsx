'use client';
import type { Conn, Status } from '@/lib/connection';
import { useTranslation } from '@/i18n/useTranslation';

const TONE: Record<Status, string> = { live: 'text-ok', connecting: 'text-warn', offline: 'text-accent', idle: 'text-t3' };
/** Shows the connected node (direct, cloud or demo) and lets the user switch. */
export default function NodeManager({ conn, status, onDisconnect }: { conn: Conn; status: Status; onDisconnect: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3 text-xs border border-white/10 bg-s1 px-3 py-1.5 mb-4">
      <span className={TONE[status]}>● {t(`status.${status}` as const)}</span>
      <span className="font-mono text-t2">{conn.mode === 'demo' ? 'demo · simulated' : `${conn.mode} · ${conn.url}`}</span>
      <button onClick={onDisconnect} className="ml-auto text-t2 hover:text-tx underline">Switch node</button>
    </div>
  );
}
