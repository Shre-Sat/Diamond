'use client';
import { ConnectionGate } from '@/components/ConnectionDialog';
import SessionWorkspace from '@/components/SessionWorkspace';
export default function Page() {
  return <ConnectionGate>{snap => <SessionWorkspace snap={snap} />}</ConnectionGate>;
}
