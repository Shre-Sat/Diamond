'use client';
import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import en, { type Key } from './locales/en';
import zh from './locales/zh';

export type Locale = 'en' | 'zh';
export interface I18n { locale: Locale; setLocale: (l: Locale) => void; t: (k: Key) => string }
export const I18nContext = createContext<I18n>({ locale: 'en', setLocale: () => {}, t: k => en[k] });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, set] = useState<Locale>('en');
  useEffect(() => { const s = localStorage.getItem('diamond.locale'); if (s === 'zh' || s === 'en') set(s); }, []);
  const setLocale = useCallback((l: Locale) => { localStorage.setItem('diamond.locale', l); set(l); }, []);
  const t = useCallback((k: Key) => (locale === 'zh' ? zh[k] : en[k]), [locale]);
  return <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>;
}
