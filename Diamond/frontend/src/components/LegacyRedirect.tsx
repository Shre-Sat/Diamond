'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
const MAP: Record<string, string> = { timeline: '/timeline/', tree: '/tree/', logs: '/logs/', metrics: '/metrics/', sessions: '/sessions/', overview: '/overview/' };
/** Old links like /?view=timeline go to the new routes. */
export default function LegacyRedirect() {
  const router = useRouter();
  useEffect(() => { const v = new URLSearchParams(window.location.search).get('view'); if (v && MAP[v]) router.replace(MAP[v]); }, [router]);
  return null;
}
