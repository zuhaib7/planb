/**
 * What the site looks like at a given month: a pure function of the engine
 * result, so the 3D view, its text description and the tests all agree.
 */
import type { Inputs, Result } from "./engine";

/** Assumed site coverage: share of the plot the building footprint covers. */
export const COVERAGE = 0.5;
export const FLOOR_HEIGHT: Record<Inputs["programme"], number> = { residential: 3.3, hospitality: 3.8, mixedUse: 3.6 };
export const MAX_FLOORS = 80;

export type Phase = "land" | "design" | "permits" | "tender" | "foundation" | "structure" | "mep" | "finishing" | "handover" | "leaseUp" | "operating";

export interface MassingState {
  month: number;
  phase: Phase;
  stageKey: string | null;
  /** 0-1 progress through the current stage */
  stageProgress: number;
  plotSide: number; // m, square plot
  footprintSide: number; // m, square footprint
  floors: number;
  floorHeight: number;
  foundation: number; // 0-1
  framed: number; // floors with structure (can be fractional while a floor is being cast)
  clad: number; // floors with facade
  services: number; // 0-1 MEP progress
  landscaped: number; // 0-1
  crane: boolean;
  occupancy: number; // 0-1 during lease-up / operation
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export function geometry(i: Inputs) {
  const gfa = i.landArea * i.far;
  const plotSide = Math.sqrt(i.landArea);
  const footprintArea = i.landArea * COVERAGE;
  const floors = Math.max(1, Math.min(MAX_FLOORS, Math.round(gfa / footprintArea)));
  // Footprint adjusts so footprint × floors still equals GFA (keeps the massing honest to the numbers).
  const footprintSide = Math.min(plotSide * 0.92, Math.sqrt(gfa / floors));
  return { plotSide, footprintSide, floors, floorHeight: FLOOR_HEIGHT[i.programme] };
}

export function massingAt(i: Inputs, r: Result, month: number): MassingState {
  const g = geometry(i);
  const m = Math.max(0, Math.min(r.exitMonth, month));
  const stage = r.schedule.find((s) => m >= s.start && m < s.start + s.months) ?? null;
  const progressIn = (key: string) => {
    const s = r.schedule.find((x) => x.key === key)!;
    // Count the month itself as worked: month `start` finishes 1/months of the stage.
    return clamp01((m - s.start + 1) / s.months);
  };

  const foundation = progressIn("foundation");
  const structure = progressIn("structure");
  const services = progressIn("mep");
  const finishing = progressIn("finishing");
  const handover = progressIn("handover");

  let phase: Phase;
  if (m === 0) phase = "land";
  else if (stage) {
    const k = stage.key;
    phase = k === "permits" ? "permits" : k === "tender" ? "tender" : ["preConcept", "concept", "coordination", "detailed"].includes(k) ? "design" : (k as Phase);
  } else phase = m <= r.stabilisedMonth ? "leaseUp" : "operating";

  const occupancy = m > r.completionMonth ? clamp01((m - r.completionMonth) / Math.max(1, i.leaseUpMonths)) * i.occupancy : 0;

  return {
    month: m,
    phase,
    stageKey: stage?.key ?? null,
    stageProgress: stage ? clamp01((m - stage.start + 1) / stage.months) : 1,
    ...g,
    foundation,
    framed: structure * g.floors,
    clad: finishing * g.floors,
    services,
    landscaped: handover,
    crane: foundation > 0 && finishing < 1,
    occupancy,
  };
}
