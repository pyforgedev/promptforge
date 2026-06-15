import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import enTranslation from '../../public/locales/en/translation.json'
import idTranslation from '../../public/locales/id/translation.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslation },
      id: { translation: idTranslation },
    },
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n
