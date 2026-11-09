import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, PageHeader } from "../../design/ui";
import { clearContentCache, useSettings, type Theme } from "../../lib/settings";
import { LANGUAGES } from "../../i18n";
import { useQueryClient } from "@tanstack/react-query";

function Toggle({ id, label, hint, checked, onChange }: { id: string; label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-4 border-t border-line py-4">
      <label htmlFor={id} className="grid">
        <span>{label}</span>
        {hint && <span id={`${id}-hint`} className="text-sm text-muted">{hint}</span>}
      </label>
      <input id={id} type="checkbox" role="switch" aria-describedby={hint ? `${id}-hint` : undefined} checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-6 w-6 accent-[var(--color-primary)]" />
    </div>
  );
}

export function SettingsPage() {
  const { t } = useTranslation();
  const s = useSettings();
  const qc = useQueryClient();
  const [cleared, setCleared] = useState(false);
  const seg = (active: boolean) => `min-h-11 rounded-sm border px-4 text-sm ${active ? "border-primary bg-primary text-on-primary" : "border-line"}`;

  return (
    <div className="max-w-xl">
      <PageHeader eyebrow={t("settings.eyebrow")} title={t("settings.title")} />
      <fieldset className="mb-6">
        <legend className="mb-3">{t("settings.language")}</legend>
        <div className="flex gap-2">
          {LANGUAGES.map((l) => (
            <button key={l} type="button" lang={l} aria-pressed={s.language === l} onClick={() => s.setLanguage(l)} className={seg(s.language === l)}>{t(`language.${l}`)}</button>
          ))}
        </div>
      </fieldset>
      <fieldset className="mb-6">
        <legend className="mb-3">{t("settings.theme")}</legend>
        <div className="flex flex-wrap gap-2">
          {(["system", "light", "dark"] as Theme[]).map((th) => (
            <button key={th} type="button" aria-pressed={s.theme === th} onClick={() => s.setTheme(th)} className={seg(s.theme === th)}>
              {t(`settings.theme${th[0].toUpperCase()}${th.slice(1)}`)}
            </button>
          ))}
        </div>
      </fieldset>
      <Toggle id="reduced-motion" label={t("settings.reducedMotion")} checked={s.reducedMotion} onChange={s.setReducedMotion} />
      <Toggle id="data-saver" label={t("settings.dataSaver")} hint={t("settings.dataSaverHint")} checked={s.dataSaver} onChange={s.setDataSaver} />
      <div className="flex flex-wrap items-center gap-4 border-t border-line py-4">
        <Button variant="ghost" onClick={async () => { await clearContentCache(); qc.clear(); setCleared(true); }}>{t("settings.clearCache")}</Button>
        <p role="status" className="text-sm text-muted">{cleared ? t("settings.cacheCleared") : ""}</p>
      </div>
      <Link to="/privacy" className="inline-flex min-h-11 items-center border-t border-line pt-4 underline">{t("settings.privacy")}</Link>
    </div>
  );
}
