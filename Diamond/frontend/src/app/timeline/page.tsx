'use client';
import { ConnectionGate } from '@/components/ConnectionDialog';
import Timeline from '@/components/timeline/Timeline';
export default function Page() {
  return <ConnectionGate>{snap => <Timeline snap={snap} />}</ConnectionGate>;
}
