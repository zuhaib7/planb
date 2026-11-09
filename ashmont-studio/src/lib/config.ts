/**
 * Runtime configuration. Values come from Vite env at build time (see .env.example).
 * Nothing here is secret: the bundle is public. Never put API keys in VITE_* variables.
 */
export const PRIVACY_POLICY_VERSION = "2026-11-draft-1";
export const CONSENT_TEXT_VERSION = "consent-v1";

const rawEndpoint = import.meta.env.VITE_CONSULTATION_ENDPOINT as string | undefined;

/** Only HTTPS endpoints are accepted. Anything else disables online submission. */
export function parseEndpoint(raw: string | undefined): URL | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

export const CONSULTATION_ENDPOINT = parseEndpoint(rawEndpoint);

/** Public contact details from the Ashmont brand guidelines. */
export const CONTACT = {
  phoneDisplay: "92 001 9083",
  phoneTel: "tel:+966920019083",
  email: "info@ashmont.com.sa",
  web: "https://www.ashmont.com.sa",
  /**
   * OPEN ITEM: the site lists two WhatsApp numbers (966920019083 and 966508910500).
   * The brand rules forbid the 050 mobile in public material until confirmed, so the
   * official line is used. Confirm with the client before release.
   */
  whatsapp: "https://wa.me/966920019083",
  maps: "https://www.google.com/maps/search/?api=1&query=Ashmont%20Prince%20Khalid%20bin%20Bandar%20bin%20Abdulaziz%20Street%20Riyadh",
} as const;
