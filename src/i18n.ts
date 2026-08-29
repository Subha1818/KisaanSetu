import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslations from './locales/en/translation.json';
import hiTranslations from './locales/hi/translation.json';
import bnTranslations from './locales/bn/translation.json';
import mrTranslations from './locales/mr/translation.json';
import teTranslations from './locales/te/translation.json';
import taTranslations from './locales/ta/translation.json';
import paTranslations from './locales/pa/translation.json';

const FONT_MAP: Record<string, { id: string; url: string }> = {
  hi: {
    id: 'font-devanagari',
    url: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap'
  },
  mr: {
    id: 'font-devanagari',
    url: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap'
  },
  bn: {
    id: 'font-bengali',
    url: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap'
  },
  te: {
    id: 'font-telugu',
    url: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Telugu:wght@400;500;600;700&display=swap'
  },
  ta: {
    id: 'font-tamil',
    url: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;500;600;700&display=swap'
  },
  pa: {
    id: 'font-gurmukhi',
    url: 'https://fonts.googleapis.com/css2?family=Noto+Sans+Gurmukhi:wght@400;500;600;700&display=swap'
  }
};

export const loadLanguageFont = (lng: string) => {
  if (typeof document === 'undefined') return;
  const font = FONT_MAP[lng];
  if (!font) return;

  if (!document.getElementById(font.id)) {
    const link = document.createElement('link');
    link.id = font.id;
    link.rel = 'stylesheet';
    link.href = font.url;
    document.head.appendChild(link);
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      hi: { translation: hiTranslations },
      bn: { translation: bnTranslations },
      mr: { translation: mrTranslations },
      te: { translation: teTranslations },
      ta: { translation: taTranslations },
      pa: { translation: paTranslations }
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // React already escapes by default
    }
  });

// Load font for initially detected/active language
if (i18n.language) {
  loadLanguageFont(i18n.language);
}

// Load font on language switch
i18n.on('languageChanged', (lng) => {
  loadLanguageFont(lng);
});

export default i18n;

