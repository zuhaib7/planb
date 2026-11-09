import { CONSENT_TEXT_VERSION, CONSULTATION_ENDPOINT, PRIVACY_POLICY_VERSION } from "../../lib/config";
import type { Consultation } from "./schema";
import type { Language } from "../../i18n";

export type SubmitResult =
  | { ok: true }
  | { ok: false; reason: "not_configured" | "offline" | "rate_limited" | "server" | "network" | "bot" };

export interface ConsultationPayload {
  projectType: Consultation["projectType"];
  location: string;
  sizeM2: number;
  timeline: Consultation["timeline"];
  contact: { name: string; phone: string; email: string };
  message: string;
  locale: Language;
  source: "ashmont-studio-app";
  consent: { accepted: true; acceptedAt: string; policyVersion: string; consentTextVersion: string };
}

/** Build the payload with only the fields the consultation needs (data minimisation). */
export function buildPayload(data: Consultation, locale: Language, now: Date = new Date()): ConsultationPayload {
  return {
    projectType: data.projectType,
    location: data.location,
    sizeM2: data.sizeM2,
    timeline: data.timeline,
    contact: { name: data.name, phone: data.phone, email: data.email },
    message: data.message,
    locale,
    source: "ashmont-studio-app",
    consent: {
      accepted: true,
      acceptedAt: now.toISOString(),
      policyVersion: PRIVACY_POLICY_VERSION,
      consentTextVersion: CONSENT_TEXT_VERSION,
    },
  };
}

const MIN_INTERVAL_MS = 30_000;
const TIMEOUT_MS = 15_000;
let lastSubmitAt = 0;

/** Test hook. */
export function _resetThrottle() {
  lastSubmitAt = 0;
}

interface SubmitOptions {
  endpoint?: URL | null;
  fetchImpl?: typeof fetch;
  online?: boolean;
  idempotencyKey?: string;
  now?: () => number;
}

/**
 * POST the consultation over HTTPS. Never logs the payload or the response body
 * (they contain personal data). The idempotency key lets the server drop duplicate
 * leads when the user retries after a timeout.
 */
export async function submitConsultation(
  data: Consultation,
  locale: Language,
  opts: SubmitOptions = {},
): Promise<SubmitResult> {
  const endpoint = opts.endpoint === undefined ? CONSULTATION_ENDPOINT : opts.endpoint;
  const fetchImpl = opts.fetchImpl ?? fetch;
  const now = opts.now ?? Date.now;
  const online = opts.online ?? (typeof navigator === "undefined" ? true : navigator.onLine);

  if (data.website) return { ok: false, reason: "bot" };
  if (!endpoint || endpoint.protocol !== "https:") return { ok: false, reason: "not_configured" };
  if (!online) return { ok: false, reason: "offline" };
  if (now() - lastSubmitAt < MIN_INTERVAL_MS) return { ok: false, reason: "rate_limited" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    lastSubmitAt = now();
    const res = await fetchImpl(endpoint.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": opts.idempotencyKey ?? crypto.randomUUID(),
      },
      body: JSON.stringify(buildPayload(data, locale)),
      credentials: "omit",
      referrerPolicy: "no-referrer",
      signal: controller.signal,
    });
    if (res.ok) return { ok: true };
    if (res.status === 429) return { ok: false, reason: "rate_limited" };
    lastSubmitAt = 0; // a server error should not lock the user out of retrying
    return { ok: false, reason: "server" };
  } catch {
    lastSubmitAt = 0;
    return { ok: false, reason: "network" };
  } finally {
    clearTimeout(timer);
  }
}
