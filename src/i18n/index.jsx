import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import en from './en.js';
import rw from './rw.js';
import fr from './fr.js';

// Lightweight, dependency-free i18n. `t('nav.workers')` looks up the key in the
// current language, falls back to English, then to the key itself. `t(key, vars)`
// interpolates {{var}} placeholders. Language is persisted in localStorage.
const DICTS = { en, rw, fr };
export const LANGS = [
  { code: 'en', label: 'English' },
  { code: 'rw', label: 'Kinyarwanda' },
  { code: 'fr', label: 'Français' },
];

function get(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try { return DICTS[localStorage.getItem('tapa_lang')] ? localStorage.getItem('tapa_lang') : 'en'; } catch { return 'en'; }
  });
  const setLang = useCallback((l) => {
    if (!DICTS[l]) return;
    try { localStorage.setItem('tapa_lang', l); } catch { /* ignore */ }
    setLangState(l);
  }, []);
  const t = useCallback((key, vars) => {
    let s = get(DICTS[lang], key);
    if (s == null) s = get(DICTS.en, key); // fall back to English
    if (s == null) return key;             // last resort: show the key
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{{${k}}}`).join(v);
    return s;
  }, [lang]);
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
export function useT() { return useI18n().t; }
