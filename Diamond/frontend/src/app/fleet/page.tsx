'use client';
import { Suspense, useEffect, useState } from 'react';
import { ConnectionGate } from '@/components/ConnectionDialog';
import FleetOverview from '@/components/FleetOverview';
import NodeOverview from '@/components/NodeOverview';
import LegacyRedirect from '@/components/LegacyRedirect';
import { loadConn } from '@/lib/connection';
import { fetchFleet } from '@/lib/controllerClient';
import { pollFleet } from '@/lib/fleetData';
import type { LiveOverview } from '@/types/event';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
export default function Fleet() {
  const [fleet, setFleet] = useState<LiveOverview | null>(null);
  useEffect(() => {
    const c = loadConn(); if (!c || c.mode === 'local') return;
    const load = c.mode === 'demo' ? () => fetch(`${basePath}/sample-overview.json`).then(r => r.json() as Promise<LiveOverview>) : () => fetchFleet(c.url, c.token);
    return pollFleet(load, setFleet, 5000);
  }, []);
  return (
    <Suspense fallback={null}><LegacyRedirect />
      <ConnectionGate>{snap => <div className="space-y-8"><FleetOverview overview={fleet} /><NodeOverview snap={snap} /></div>}</ConnectionGate>
    </Suspense>
  );
}
