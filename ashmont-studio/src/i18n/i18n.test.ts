import { describe, expect, it } from "vitest";
import en from "./locales/en.json";
import ar from "./locales/ar.json";
import { applyDocumentLanguage, directionOf, isLanguage } from ".";

type Tree = { [k: string]: unknown };
function shape(obj: unknown, prefix = ""): string[] {
  if (Array.isArray(obj)) return [`${prefix}[${obj.length}]`];
  if (obj && typeof obj === "object")
    return Object.entries(obj as Tree).flatMap(([k, v]) => shape(v, prefix ? `${prefix}.${k}` : k));
  return [prefix];
}
const placeholders = (s: string) => [...s.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();
function leaves(obj: unknown, prefix = ""): [string, string][] {
  if (typeof obj === "string") return [[prefix, obj]];
  if (Array.isArray(obj)) return obj.flatMap((v, i) => leaves(v, `${prefix}[${i}]`));
  return Object.entries(obj as Tree).flatMap(([k, v]) => leaves(v, prefix ? `${prefix}.${k}` : k));
}

describe("locales", () => {
  it("Arabic and English have identical key sets", () => {
    expect(shape(ar).sort()).toEqual(shape(en).sort());
  });
  it("interpolation placeholders match in both languages", () => {
    const arMap = new Map(leaves(ar));
    for (const [key, value] of leaves(en)) expect([key, placeholders(arMap.get(key) ?? "")]).toEqual([key, placeholders(value)]);
  });
  it("no string is empty", () => {
    for (const [key, value] of [...leaves(en), ...leaves(ar)]) expect([key, value.trim().length > 0]).toEqual([key, true]);
  });
  it("brand voice: no exclamation marks", () => {
    for (const [key, value] of [...leaves(en), ...leaves(ar)]) expect([key, /[!！]/.test(value)]).toEqual([key, false]);
  });
});

describe("direction", () => {
  it("maps languages to direction", () => {
    expect(directionOf("ar")).toBe("rtl");
    expect(directionOf("en")).toBe("ltr");
  });
  it("sets lang and dir on <html> in both directions", () => {
    applyDocumentLanguage("ar");
    expect(document.documentElement.dir).toBe("rtl");
    expect(document.documentElement.lang).toBe("ar");
    applyDocumentLanguage("en");
    expect(document.documentElement.dir).toBe("ltr");
  });
  it("guards unknown languages", () => {
    expect(isLanguage("fr")).toBe(false);
    expect(isLanguage("ar")).toBe(true);
  });
});
