import { useTranslation } from "react-i18next";
import { LANGUAGES } from "../i18n";
import { useSettings } from "../lib/settings";
import { Wordmark } from "../design/ui";

/** Splash and language select, shown on first launch. */
export function LanguageGate() {
  const { t } = useTranslation();
  const setLanguage = useSettings((s) => s.setLanguage);
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-10 px-6 text-center">
      <div>
        <Wordmark className="justify-center text-3xl" />
        <p className="eyebrow mt-3">Architecture • Interior Design • Engineering</p>
      </div>
      <div>
        <h1 className="mb-6 text-xl font-light">{t("language.title")}</h1>
        <div className="flex gap-3">
          {LANGUAGES.map((l) => (
            <button key={l} type="button" lang={l} onClick={() => setLanguage(l)} className="min-h-12 min-w-32 rounded-sm border border-line px-6 text-lg hover:bg-surface">
              {l === "ar" ? "العربية" : "English"}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
