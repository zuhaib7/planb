import { beforeEach, describe, expect, it, vi } from "vitest";
import { consultationSchema } from "./schema";
import { _resetThrottle, buildPayload, submitConsultation } from "./submit";
import { parseEndpoint, PRIVACY_POLICY_VERSION } from "../../lib/config";

const data = consultationSchema.parse({
  projectType: "hospitality", location: "AlUla", sizeM2: 12000, timeline: "6m",
  name: "Omar", phone: "0551112222", email: "omar@example.com", consent: true,
});
const endpoint = new URL("https://api.example.sa/v1/consultations");
const ok = () => vi.fn(async () => new Response(null, { status: 201 }));

beforeEach(() => _resetThrottle());

describe("buildPayload", () => {
  it("records consent with timestamp and policy version, and nothing extra", () => {
    const p = buildPayload(data, "ar", new Date("2026-11-09T10:00:00Z"));
    expect(p.consent).toEqual({ accepted: true, acceptedAt: "2026-11-09T10:00:00.000Z", policyVersion: PRIVACY_POLICY_VERSION, consentTextVersion: "consent-v1" });
    expect(Object.keys(p).sort()).toEqual(["consent", "contact", "locale", "location", "message", "projectType", "sizeM2", "source", "timeline"]);
    expect(JSON.stringify(p)).not.toContain("website");
  });
});

describe("parseEndpoint", () => {
  it("accepts only https", () => {
    expect(parseEndpoint("https://a.sa/x")?.host).toBe("a.sa");
    expect(parseEndpoint("http://a.sa/x")).toBeNull();
    expect(parseEndpoint("javascript:alert(1)")).toBeNull();
    expect(parseEndpoint(undefined)).toBeNull();
  });
});

describe("submitConsultation", () => {
  it("is disabled without an endpoint", async () => {
    expect(await submitConsultation(data, "en", { endpoint: null, fetchImpl: ok() })).toEqual({ ok: false, reason: "not_configured" });
  });

  it("POSTs JSON with an idempotency key and no credentials", async () => {
    const f = ok();
    expect(await submitConsultation(data, "en", { endpoint, fetchImpl: f, online: true, idempotencyKey: "k1" })).toEqual({ ok: true });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(endpoint.toString());
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("omit");
    expect((init.headers as Record<string, string>)["Idempotency-Key"]).toBe("k1");
  });

  it("reports offline without calling the network", async () => {
    const f = ok();
    expect(await submitConsultation(data, "en", { endpoint, fetchImpl: f, online: false })).toEqual({ ok: false, reason: "offline" });
    expect(f).not.toHaveBeenCalled();
  });

  it("throttles rapid repeat submissions client-side", async () => {
    const f = ok();
    let t = 1_000_000;
    await submitConsultation(data, "en", { endpoint, fetchImpl: f, online: true, now: () => t });
    t += 5_000;
    expect(await submitConsultation(data, "en", { endpoint, fetchImpl: f, online: true, now: () => t })).toEqual({ ok: false, reason: "rate_limited" });
    expect(f).toHaveBeenCalledTimes(1);
  });

  it("maps 429 and 5xx", async () => {
    expect(await submitConsultation(data, "en", { endpoint, online: true, fetchImpl: vi.fn(async () => new Response(null, { status: 429 })) })).toEqual({ ok: false, reason: "rate_limited" });
    _resetThrottle();
    expect(await submitConsultation(data, "en", { endpoint, online: true, fetchImpl: vi.fn(async () => new Response(null, { status: 500 })) })).toEqual({ ok: false, reason: "server" });
  });

  it("never logs personal data on failure", async () => {
    const spies = (["log", "error", "warn", "info", "debug"] as const).map((m) => vi.spyOn(console, m));
    await submitConsultation(data, "en", { endpoint, online: true, fetchImpl: vi.fn(async () => { throw new TypeError("boom"); }) });
    for (const s of spies) expect(s).not.toHaveBeenCalled();
  });

  it("drops honeypot submissions silently", async () => {
    const f = ok();
    expect(await submitConsultation({ ...data, website: "x" }, "en", { endpoint, fetchImpl: f, online: true })).toEqual({ ok: false, reason: "bot" });
    expect(f).not.toHaveBeenCalled();
  });
});
