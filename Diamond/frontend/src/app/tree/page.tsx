'use client';
import { ConnectionGate } from '@/components/ConnectionDialog';
import ProcessTreeView from '@/components/ProcessTreeView';
export default function Page() {
  return <ConnectionGate>{snap => <ProcessTreeView snap={snap} />}</ConnectionGate>;
}
