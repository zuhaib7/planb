import { z } from "zod";
import { DEFAULTS, type Inputs, type Programme } from "./engine";

export type NumericKey = Exclude<keyof Inputs, "programme" | "coordination">;

export interface FieldSpec {
  key: NumericKey;
  unit: "m2" | "sarM2" | "sarM2y" | "pct" | "months" | "x";
  /** shown value = stored value × scale (percentages are stored as fractions) */
  scale: number;
  min: number; // in shown units
  max: number;
  step: number;
  hint?: boolean;
}

const pct = (key: NumericKey, min: number, max: number, step = 0.5, hint = false): FieldSpec => ({ key, unit: "pct", scale: 100, min, max, step, hint });

export const GROUPS: { key: "project" | "costs" | "income" | "finance"; fields: FieldSpec[] }[] = [
  {
    key: "project",
    fields: [
      { key: "landArea", unit: "m2", scale: 1, min: 200, max: 500_000, step: 100 },
      { key: "far", unit: "x", scale: 1, min: 0.2, max: 15, step: 0.1, hint: true },
      pct("efficiency", 40, 98, 1),
    ],
  },
  {
    key: "costs",
    fields: [
      { key: "landPrice", unit: "sarM2", scale: 1, min: 0, max: 100_000, step: 100 },
      pct("transferTax", 0, 15, 0.5, true),
      { key: "hardCost", unit: "sarM2", scale: 1, min: 500, max: 30_000, step: 100 },
      pct("softCostPct", 0, 40, 0.5, true),
      pct("contingencyPct", 0, 30, 0.5, true),
    ],
  },
  {
    key: "income",
    fields: [
      { key: "rent", unit: "sarM2y", scale: 1, min: 0, max: 20_000, step: 50 },
      pct("occupancy", 10, 100, 1),
      pct("opexPct", 0, 80, 1),
      { key: "leaseUpMonths", unit: "months", scale: 1, min: 0, max: 60, step: 1 },
    ],
  },
  {
    key: "finance",
    fields: [
      pct("exitCap", 3, 15, 0.25),
      { key: "holdMonths", unit: "months", scale: 1, min: 0, max: 240, step: 6 },
      pct("ltc", 0, 85, 1),
      pct("interest", 0, 25, 0.25),
      pct("targetProfit", 0, 100, 1, true),
      pct("discountRate", 0, 30, 0.5),
    ],
  },
];

export const ALL_FIELDS = GROUPS.flatMap((g) => g.fields);

/** Validate a scenario from outside the app (a shared link). Ranges match the input fields. */
const numeric = Object.fromEntries(
  ALL_FIELDS.map((f) => [f.key, z.number().finite().min(f.min / f.scale).max(f.max / f.scale)]),
) as Record<NumericKey, z.ZodNumber>;

export const InputsSchema = z.object({
  programme: z.enum(["residential", "hospitality", "mixedUse"]),
  coordination: z.enum(["integrated", "fragmented"]),
  ...numeric,
  sellCostPct: z.number().min(0).max(0.1),
});

export function encodeScenario(i: Inputs): string {
  return btoa(JSON.stringify(i)); // ASCII only: numbers and enum strings
}

export function decodeScenario(s: string | null): Inputs | null {
  if (!s || s.length > 4000) return null;
  try {
    const parsed = InputsSchema.safeParse(JSON.parse(atob(s)));
    return parsed.success ? (parsed.data as Inputs) : null;
  } catch {
    return null;
  }
}

export const defaultsFor = (p: Programme): Inputs => ({ ...DEFAULTS[p] });
