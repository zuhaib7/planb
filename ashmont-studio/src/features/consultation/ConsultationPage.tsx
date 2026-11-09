import { useId, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, PageHeader } from "../../design/ui";
import type { Language } from "../../i18n";
import { consultationSchema, errorParams, fieldErrors, PROJECT_TYPES, STEP_SCHEMAS, TIMELINES, type ConsultationInput } from "./schema";
import { submitConsultation, type SubmitResult } from "./submit";

type Values = Record<keyof ConsultationInput, string | boolean>;
const EMPTY: Values = { projectType: "", location: "", sizeM2: "", timeline: "", name: "", phone: "", email: "", message: "", consent: false, website: "" };
const STEP_KEYS = ["project", "details", "contact"] as const;
const STEP_FIELDS: (keyof Values)[][] = [["projectType", "location"], ["sizeM2", "timeline"], ["name", "phone", "email", "message", "consent", "website"]];

type Status = { kind: "idle" } | { kind: "sending" } | { kind: "done" } | { kind: "failed"; reason: Exclude<SubmitResult, { ok: true }>["reason"] };

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-sm">{label}</label>
      {children}
      <p id={`${id}-error`} className="min-h-5 text-sm text-danger" aria-live="polite">{error ?? ""}</p>
    </div>
  );
}

const inputClass = "min-h-11 w-full rounded-sm border border-line bg-surface px-3 text-fg aria-[invalid=true]:border-danger";

export function ConsultationPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Language;
  const uid = useId();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const idempotencyKey = useRef(crypto.randomUUID());
  const formRef = useRef<HTMLFormElement>(null);

  const set = (k: keyof Values) => (v: string | boolean) => {
    setValues((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((e) => { const n = { ...e }; delete n[k]; return n; });
  };
  const msg = (k: string) => (errors[k] ? t(errors[k], errorParams(k)) : undefined);
  const a11y = (k: string) => ({ id: `${uid}-${k}`, "aria-invalid": Boolean(errors[k]), "aria-describedby": `${uid}-${k}-error` });

  const focusFirstError = (errs: Record<string, string>) => {
    const first = STEP_FIELDS[step].find((f) => errs[f]);
    if (first) requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>(`#${CSS.escape(`${uid}-${first}`)}`)?.focus());
  };

  const validateStep = () => {
    const r = STEP_SCHEMAS[step].safeParse(values);
    if (r.success) { setErrors({}); return true; }
    const errs = fieldErrors(r.error);
    setErrors(errs);
    focusFirstError(errs);
    return false;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep()) return;
    if (step < STEP_SCHEMAS.length - 1) { setStep(step + 1); return; }
    const parsed = consultationSchema.safeParse(values);
    if (!parsed.success) { setErrors(fieldErrors(parsed.error)); return; }
    setStatus({ kind: "sending" });
    const result = await submitConsultation(parsed.data, lang, { idempotencyKey: idempotencyKey.current });
    if (result.ok || result.reason === "bot") {
      setStatus({ kind: "done" });
      setValues(EMPTY); // keep no personal data in memory after submission
    } else setStatus({ kind: "failed", reason: result.reason });
  };

  if (status.kind === "done") {
    return (
      <div>
        <PageHeader eyebrow={t("consultation.eyebrow")} title={t("consultation.title")} />
        <p role="status" className="text-lg">{t("consultation.success")}</p>
        <Button variant="ghost" className="mt-6" onClick={() => { idempotencyKey.current = crypto.randomUUID(); setStep(0); setStatus({ kind: "idle" }); }}>
          {t("consultation.another")}
        </Button>
      </div>
    );
  }

  const failureText = status.kind === "failed"
    ? t({ rate_limited: "consultation.rateLimited", offline: "consultation.offline", not_configured: "consultation.notConfigured", server: "consultation.error", network: "consultation.error", bot: "consultation.error" }[status.reason])
    : "";

  return (
    <div className="max-w-xl">
      <PageHeader eyebrow={t("consultation.eyebrow")} title={t("consultation.title")} />
      <p className="eyebrow mb-2" aria-live="polite">{t("consultation.step", { current: step + 1, total: STEP_KEYS.length })}</p>
      <form ref={formRef} noValidate onSubmit={onSubmit} aria-labelledby={`${uid}-legend`}>
        <h2 id={`${uid}-legend`} className="mb-6 text-2xl font-light">{t(`consultation.steps.${STEP_KEYS[step]}`)}</h2>

        {step === 0 && (
          <div className="grid gap-2">
            <Field id={`${uid}-projectType`} label={t("consultation.projectType")} error={msg("projectType")}>
              <select {...a11y("projectType")} className={inputClass} value={values.projectType as string} onChange={(e) => set("projectType")(e.target.value)}>
                <option value="">—</option>
                {PROJECT_TYPES.map((p) => <option key={p} value={p}>{t(`consultation.types.${p}`)}</option>)}
              </select>
            </Field>
            <Field id={`${uid}-location`} label={t("consultation.location")} error={msg("location")}>
              <input {...a11y("location")} className={inputClass} autoComplete="address-level2" value={values.location as string} onChange={(e) => set("location")(e.target.value)} />
            </Field>
          </div>
        )}

        {step === 1 && (
          <div className="grid gap-2">
            <Field id={`${uid}-sizeM2`} label={t("consultation.size")} error={msg("sizeM2")}>
              <input {...a11y("sizeM2")} className={inputClass} inputMode="numeric" dir="ltr" value={values.sizeM2 as string} onChange={(e) => set("sizeM2")(e.target.value)} />
            </Field>
            <Field id={`${uid}-timeline`} label={t("consultation.timeline")} error={msg("timeline")}>
              <select {...a11y("timeline")} className={inputClass} value={values.timeline as string} onChange={(e) => set("timeline")(e.target.value)}>
                <option value="">—</option>
                {TIMELINES.map((p) => <option key={p} value={p}>{t(`consultation.timelines.${p}`)}</option>)}
              </select>
            </Field>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-2">
            <Field id={`${uid}-name`} label={t("consultation.name")} error={msg("name")}>
              <input {...a11y("name")} className={inputClass} autoComplete="name" value={values.name as string} onChange={(e) => set("name")(e.target.value)} />
            </Field>
            <Field id={`${uid}-phone`} label={t("consultation.phone")} error={msg("phone")}>
              <input {...a11y("phone")} className={inputClass} type="tel" inputMode="tel" autoComplete="tel" dir="ltr" placeholder="05X XXX XXXX" value={values.phone as string} onChange={(e) => set("phone")(e.target.value)} />
            </Field>
            <Field id={`${uid}-email`} label={t("consultation.email")} error={msg("email")}>
              <input {...a11y("email")} className={inputClass} type="email" inputMode="email" autoComplete="email" dir="ltr" value={values.email as string} onChange={(e) => set("email")(e.target.value)} />
            </Field>
            <Field id={`${uid}-message`} label={t("consultation.message")} error={msg("message")}>
              <textarea {...a11y("message")} className={`${inputClass} min-h-28 py-2`} maxLength={1000} value={values.message as string} onChange={(e) => set("message")(e.target.value)} />
            </Field>
            {/* Honeypot: off-screen, not focusable, hidden from assistive tech. */}
            <div aria-hidden="true" className="absolute -start-[9999px] h-px w-px overflow-hidden">
              <label>Website<input tabIndex={-1} autoComplete="off" value={values.website as string} onChange={(e) => set("website")(e.target.value)} /></label>
            </div>
            <div className="grid gap-2">
              <div className="flex items-start gap-3">
                <input {...a11y("consent")} type="checkbox" className="mt-1 h-6 w-6 shrink-0 accent-[var(--color-primary)]" checked={values.consent as boolean} onChange={(e) => set("consent")(e.target.checked)} />
                <label htmlFor={`${uid}-consent`} className="text-sm">{t("consultation.consent")}</label>
              </div>
              <Link to="/privacy" className="ms-9 inline-flex min-h-11 items-center text-sm underline">{t("consultation.readPrivacy")}</Link>
              <p id={`${uid}-consent-error`} className="min-h-5 text-sm text-danger" aria-live="polite">{msg("consent") ?? ""}</p>
            </div>
          </div>
        )}

        {status.kind === "failed" && <p role="alert" className="mb-4 text-danger">{failureText}</p>}

        <div className="mt-4 flex gap-3">
          {step > 0 && <Button type="button" variant="ghost" onClick={() => { setErrors({}); setStep(step - 1); }}>{t("consultation.back")}</Button>}
          <Button type="submit" disabled={status.kind === "sending"}>
            {status.kind === "sending" ? t("consultation.sending") : step < STEP_KEYS.length - 1 ? t("consultation.next") : status.kind === "failed" ? t("consultation.retry") : t("consultation.submit")}
          </Button>
        </div>
      </form>
    </div>
  );
}
