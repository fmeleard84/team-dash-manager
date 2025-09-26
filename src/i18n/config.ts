import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslations from './locales/en.json';
import frTranslations from './locales/fr.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslations,
      },
      fr: {
        translation: frTranslations,
      },
    },
    lng: 'fr', // Force French as default
    fallbackLng: 'fr',
    debug: false,

    ns: ['translation'],
    defaultNS: 'translation',

    interpolation: {
      escapeValue: false,
    },

    react: {
      useSuspense: false, // Disable suspense to avoid loading issues
    },

    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
  });

export default i18n;