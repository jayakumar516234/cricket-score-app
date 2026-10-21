import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { code: 'en', label: 'EN', full: 'English' },
  { code: 'ta', label: 'த', full: 'தமிழ்' },
];

/**
 * Compact language toggle — shows current lang, cycles through options on click.
 * Drop it anywhere in the UI: Header, Sidebar footer, Login page, etc.
 */
export function LanguageSwitcher({ className = '' }) {
  const { i18n } = useTranslation();
  const current = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];
  const next = LANGUAGES.find((l) => l.code !== i18n.language) || LANGUAGES[1];

  return (
    <button
      onClick={() => i18n.changeLanguage(next.code)}
      className={`flex items-center gap-1.5 rounded-lg border border-current/20 bg-current/5 px-2.5 py-1 text-xs font-bold uppercase tracking-wider transition hover:bg-current/10 ${className}`}
      aria-label={`Switch to ${next.full}`}
      title={`Switch to ${next.full}`}
    >
      <span className="text-base leading-none">{current.code === 'ta' ? '🇮🇳' : '🌐'}</span>
      <span>{current.label}</span>
    </button>
  );
}

/**
 * Full dropdown language selector — for Settings or profile panels.
 */
export function LanguageSelect({ className = '' }) {
  const { i18n, t } = useTranslation();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-xs font-semibold text-slate-500">{t('common.language')}:</span>
      <div className="flex gap-1">
        {LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => i18n.changeLanguage(lang.code)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              i18n.language === lang.code
                ? 'bg-pitch-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            aria-pressed={i18n.language === lang.code}
          >
            {lang.full}
          </button>
        ))}
      </div>
    </div>
  );
}
