import { useI18n, LANGS } from '../i18n/index.jsx';

// Compact language selector (English / Kinyarwanda / Français). Persists via the
// i18n provider. Sits in the public navbar and the dashboard top bar.
export function LanguageSwitcher() {
  const { lang, setLang } = useI18n();
  return (
    <select className="lang-switch" value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Language">
      {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
    </select>
  );
}
