import { z } from "zod";

/** Error messages are i18n keys; params for them live in ERROR_PARAMS. */
export const LIMITS = {
  name: { min: 2, max: 100 },
  location: { min: 2, max: 100 },
  message: { max: 1000 },
  size: { min: 20, max: 1_000_000 },
} as const;

export const PROJECT_TYPES = ["residential", "commercial", "hospitality", "mixedUse", "interior"] as const;
export const TIMELINES = ["now", "3m", "6m", "later"] as const;

const ARABIC_INDIC = /[٠-٩۰-۹]/g;
/** Convert Arabic-Indic and Persian digits to ASCII so users can type either. */
export function toAsciiDigits(s: string): string {
  return s.replace(ARABIC_INDIC, (d) => String((d.charCodeAt(0) & 0xf) % 10));
}

/**
 * Normalise a Saudi mobile number to E.164 (+9665XXXXXXXX).
 * Accepts 05XXXXXXXX, 5XXXXXXXX, 9665XXXXXXXX, +9665XXXXXXXX, 009665XXXXXXXX,
 * with spaces or dashes, in ASCII or Arabic-Indic digits. Returns null if invalid.
 */
export function normaliseSaudiMobile(input: string): string | null {
  const digits = toAsciiDigits(input).replace(/[\s\-().]/g, "");
  const m = /^(?:\+?966|00966|0)?(5\d{8})$/.exec(digits);
  return m ? `+966${m[1]}` : null;
}

const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(1, "errors.required")
    .min(min, "errors.tooShort")
    .max(max, "errors.tooLong")
    // Strip control characters; the server validates again.
    .transform((s) => s.replace(/[\u0000-\u001F\u007F]/g, ""));

export const projectStep = z.object({
  projectType: z.enum(PROJECT_TYPES, { error: "errors.choose" }),
  location: text(LIMITS.location.min, LIMITS.location.max),
});

export const detailsStep = z.object({
  sizeM2: z.preprocess(
    (v) => (typeof v === "string" ? (v.trim() === "" ? undefined : Number(toAsciiDigits(v).replace(/[,٬\s]/g, ""))) : v),
    z
      .number({ error: "errors.required" })
      .int("errors.number")
      .min(LIMITS.size.min, "errors.number")
      .max(LIMITS.size.max, "errors.number"),
  ),
  timeline: z.enum(TIMELINES, { error: "errors.choose" }),
});

export const contactStep = z.object({
  name: text(LIMITS.name.min, LIMITS.name.max),
  phone: z
    .string()
    .trim()
    .min(1, "errors.required")
    .transform((v, ctx) => {
      const n = normaliseSaudiMobile(v);
      if (!n) {
        ctx.addIssue({ code: "custom", message: "errors.phone" });
        return z.NEVER;
      }
      return n;
    }),
  email: z.string().trim().min(1, "errors.required").pipe(z.email("errors.email")).transform((s) => s.toLowerCase()),
  message: z.string().trim().max(LIMITS.message.max, "errors.tooLong").optional().default(""),
  consent: z.literal(true, { error: "errors.consent" }),
  /** Honeypot: hidden from people, filled in by naive bots. Must stay empty. */
  website: z.string().max(0).optional().default(""),
});

export const consultationSchema = projectStep.extend(detailsStep.shape).extend(contactStep.shape);
export type ConsultationInput = z.input<typeof consultationSchema>;
export type Consultation = z.output<typeof consultationSchema>;

export const STEP_SCHEMAS = [projectStep, detailsStep, contactStep] as const;

/** Params for interpolated error keys, by field. */
export function errorParams(field: string): Record<string, number> {
  switch (field) {
    case "name":
      return { min: LIMITS.name.min, max: LIMITS.name.max };
    case "location":
      return { min: LIMITS.location.min, max: LIMITS.location.max };
    case "message":
      return { max: LIMITS.message.max };
    case "sizeM2":
      return { min: LIMITS.size.min, max: LIMITS.size.max };
    default:
      return {};
  }
}

/** Flatten a zod error to { field: i18nKey } (first issue per field). */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!(key in out)) out[key] = issue.message.startsWith("errors.") ? issue.message : "errors.required";
  }
  return out;
}
