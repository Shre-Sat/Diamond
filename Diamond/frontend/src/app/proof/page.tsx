import { Suspense } from 'react';
import LegacyRedirect from '@/components/LegacyRedirect';
import PoaDashboard from '@/components/poa/PoaDashboard';

/** The Proof-of-Agent dashboard is the home page. The previous DIAMOND fleet overview lives at /fleet/. */
export default function Page() {
  return <Suspense fallback={null}><LegacyRedirect /><PoaDashboard /></Suspense>;
}
