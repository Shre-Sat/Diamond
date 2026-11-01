'use client';
import { ConnectionGate } from '@/components/ConnectionDialog';
import NodeOverview from '@/components/NodeOverview';
export default function Page() {
  return <ConnectionGate>{snap => <NodeOverview snap={snap} />}</ConnectionGate>;
}
