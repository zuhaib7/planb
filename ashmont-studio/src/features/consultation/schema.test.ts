import { describe, expect, it } from "vitest";
import { consultationSchema, contactStep, detailsStep, fieldErrors, normaliseSaudiMobile, projectStep, toAsciiDigits } from "./schema";

const valid = {
  projectType: "residential",
  location: "Riyadh, Al-Yasmin",
  sizeM2: "650",
  timeline: "3m",
  name: "Sara Al-Qahtani",
  phone: "050 123 4567",
  email: "Sara@Example.com",
  message: "",
  consent: true,
  website: "",
};

describe("normaliseSaudiMobile", () => {
  it.each([
    ["0501234567", "+966501234567"],
    ["501234567", "+966501234567"],
    ["+966 50 123 4567", "+966501234567"],
    ["00966501234567", "+966501234567"],
    ["966-50-123-4567", "+966501234567"],
    ["٠٥٠١٢٣٤٥٦٧", "+966501234567"],
  ])("%s -> %s", (input, out) => expect(normaliseSaudiMobile(input)).toBe(out));

  it.each(["0112345678", "05012345", "+971501234567", "abc", ""])("rejects %s", (input) =>
    expect(normaliseSaudiMobile(input)).toBeNull(),
  );
});

describe("toAsciiDigits", () => {
  it("converts Arabic-Indic and Persian digits", () => {
    expect(toAsciiDigits("٠١٢٣٤٥٦٧٨٩")).toBe("0123456789");
    expect(toAsciiDigits("۱۲۳")).toBe("123");
  });
});

describe("consultationSchema", () => {
  it("accepts a complete request and normalises fields", () => {
    const r = consultationSchema.parse(valid);
    expect(r.phone).toBe("+966501234567");
    expect(r.email).toBe("sara@example.com");
    expect(r.sizeM2).toBe(650);
  });

  it("accepts Arabic-Indic digits for size", () => {
    expect(detailsStep.parse({ sizeM2: "١٬٢٠٠", timeline: "now" }).sizeM2).toBe(1200);
  });

  it("requires consent", () => {
    const r = consultationSchema.safeParse({ ...valid, consent: false });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error).consent).toBe("errors.consent");
  });

  it("maps every invalid field to an i18n key", () => {
    const r = consultationSchema.safeParse({ ...valid, projectType: "castle", location: "", sizeM2: "5", timeline: "", name: "A", phone: "123", email: "nope", consent: false });
    expect(r.success).toBe(false);
    if (r.success) return;
    expect(fieldErrors(r.error)).toEqual({
      projectType: "errors.choose",
      location: "errors.required",
      sizeM2: "errors.number",
      timeline: "errors.choose",
      name: "errors.tooShort",
      phone: "errors.phone",
      email: "errors.email",
      consent: "errors.consent",
    });
  });

  it("rejects an overlong message", () => {
    expect(contactStep.safeParse({ ...valid, message: "x".repeat(1001) }).success).toBe(false);
  });

  it("rejects a filled honeypot", () => {
    expect(contactStep.safeParse({ ...valid, website: "http://spam" }).success).toBe(false);
  });

  it("strips control characters", () => {
    expect(projectStep.parse({ projectType: "interior", location: "Jeddah\u0007" }).location).toBe("Jeddah");
  });
});
