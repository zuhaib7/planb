import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import ar from "./locales/ar.json";

export const LANGUAGES = ["ar", "en"] as const;
export type Language = (typeof LANGUAGES)[number];

export const isLanguage = (v: unknown): v is Language =>
  typeof v === "string" && (LANGUAGES as readonly string[]).includes(v);

export const directionOf = (lang: Language): "rtl" | "ltr" => (lang === "ar" ? "rtl" : "ltr");

/** Keep <html lang> and <html dir> in sync so logical CSS properties mirror correctly. */
export function applyDocumentLanguage(lang: Language, doc: Document = document): void {
  doc.documentElement.lang = lang;
  doc.documentElement.dir = directionOf(lang);
}

export function initI18n(lang: Language) {
  if (!i18n.isInitialized) {
    void i18n.use(initReactI18next).init({
      resources: { en: { translation: en }, ar: { translation: ar } },
      lng: lang,
      fallbackLng: "en",
      interpolation: { escapeValue: false }, // React escapes output
      returnObjects: true,
    });
  } else {
    void i18n.changeLanguage(lang);
  }
  applyDocumentLanguage(lang);
  return i18n;
}

export { i18n };
