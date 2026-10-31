'use client';
import { useTranslation } from '@/i18n/useTranslation';
export default function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation();
  return (
    <div role="group" aria-label="Language" className="flex text-xs font-mono">
      {(['en', 'zh'] as const).map(l => (
        <button key={l} onClick={() => setLocale(l)} aria-pressed={locale === l}
          className={`px-2 py-1 border border-white/10 ${locale === l ? 'bg-accent text-white' : 'text-t2 hover:bg-s2'}`}>{l.toUpperCase()}</button>
      ))}
    </div>
  );
}
