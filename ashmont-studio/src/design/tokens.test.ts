import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { contrast } from "./contrast";

const css = readFileSync(resolve(process.cwd(), "src/design/tokens.css"), "utf8");

function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  const body = css.slice(start, css.indexOf("}", start));
  const vars: Record<string, string> = {};
  for (const m of body.matchAll(/--([\w-]+):\s*([^;]+);/g)) vars[m[1]] = m[2].trim();
  return vars;
}

const root = block(":root");
function resolveVar(value: string, scope: Record<string, string>): string {
  const ref = /^var\(--([\w-]+)\)$/.exec(value);
  if (!ref) return value.toLowerCase();
  return resolveVar(scope[ref[1]] ?? root[ref[1]], scope);
}

const AA_TEXT = 4.5;

describe.each([
  ["light", root],
  ["dark", { ...root, ...block(':root[data-theme="dark"]') }],
])("%s theme tokens meet WCAG 2.2 AA", (_name, scope) => {
  const get = (k: string) => resolveVar(scope[k], scope);
  it.each(["color-fg", "color-fg-muted", "color-accent-ink", "color-danger"])("%s on bg", (k) => {
    expect(contrast(get(k), get("color-bg"))).toBeGreaterThanOrEqual(AA_TEXT);
  });
  it("on-primary text on primary", () => {
    expect(contrast(get("color-on-primary"), get("color-primary"))).toBeGreaterThanOrEqual(AA_TEXT);
  });
  it("focus ring is visible on bg (3:1 non-text)", () => {
    expect(contrast(get("color-focus"), get("color-bg"))).toBeGreaterThanOrEqual(3);
  });
});

describe("raw brand gold", () => {
  it("is not safe as text on cream, which is why gold-ink exists", () => {
    expect(contrast("#b2a05e", "#f8f5eb")).toBeLessThan(3);
  });
});
