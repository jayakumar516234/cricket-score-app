import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ta from './locales/ta.json';

const STORAGE_KEY = 'cricket_lang';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ta: { translation: ta },
    },
    lng: localStorage.getItem(STORAGE_KEY) || 'en', // default English
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes
    },
  });

// Persist language choice whenever it changes
i18n.on('languageChanged', (lng) => {
  localStorage.setItem(STORAGE_KEY, lng);
  document.documentElement.lang = lng;
});

export default i18n;
