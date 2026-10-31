'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import LanguageSwitcher from './common/LanguageSwitcher';

const NAV = [['/', 'nav.poa'], ['/fleet/', 'nav.overview'], ['/sessions/', 'nav.sessions'], ['/timeline/', 'nav.timeline'], ['/tree/', 'nav.tree'], ['/logs/', 'nav.logs'], ['/metrics/', 'nav.metrics']] as const;
export default function AppShell({ children }: { children: ReactNode }) {
  const { t } = useTranslation(), path = usePathname();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center gap-6 px-5 h-11 border-b border-white/10 bg-deep">
        <span className="tracking-[.14em] text-xs"><span className="text-accent">◆</span> DIAMOND</span>
        <nav className="flex gap-4 text-sm">{NAV.map(([h, k]) => <Link key={h} href={h} className={path === h || (h !== '/' && path.startsWith(h.slice(0, -1))) ? 'text-tx border-b-2 border-accent' : 'text-t2 hover:text-tx'}>{t(k)}</Link>)}</nav>
        <span className="ml-auto"><LanguageSwitcher /></span>
      </header>
      <main className={path === '/' ? 'flex-1 w-full' : 'flex-1 p-5 max-w-6xl w-full mx-auto'}>{children}</main>
    </div>
  );
}
