import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { I18nProvider } from '@/i18n/context';
import AppShell from '@/components/AppShell';

export const metadata: Metadata = { title: 'Proof-of-Agent — DIAMOND' };
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en"><head>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
    </head><body><I18nProvider><AppShell>{children}</AppShell></I18nProvider></body></html>
  );
}
