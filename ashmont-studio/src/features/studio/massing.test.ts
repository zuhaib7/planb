import { describe, expect, it } from "vitest";
import { DEFAULTS, simulate } from "./engine";
import { COVERAGE, MAX_FLOORS, geometry, massingAt } from "./massing";

const i = DEFAULTS.residential;
const r = simulate(i);
const start = (k: string) => r.schedule.find((s) => s.key === k)!.start;
const end = (k: string) => { const s = r.schedule.find((x) => x.key === k)!; return s.start + s.months - 1; };

describe("massing geometry", () => {
  it("footprint × floors equals the gross floor area the finance model uses", () => {
    for (const d of Object.values(DEFAULTS)) {
      const g = geometry(d);
      expect(g.footprintSide ** 2 * g.floors).toBeCloseTo(d.landArea * d.far, 3);
      expect(g.footprintSide).toBeLessThan(g.plotSide);
    }
  });
  it("uses the assumed coverage and caps floors", () => {
    expect(geometry(i).floors).toBe(Math.round(i.far / COVERAGE));
    expect(geometry({ ...i, far: 15, landArea: 200 }).floors).toBeLessThanOrEqual(MAX_FLOORS);
  });
});

describe("massing over time", () => {
  it("is an empty plot during design and permits", () => {
    for (const m of [0, start("concept"), start("permits"), end("tender")]) {
      const s = massingAt(i, r, m);
      expect([m, s.framed, s.clad, s.foundation]).toEqual([m, 0, 0, 0]);
      expect(s.crane).toBe(false);
    }
    expect(massingAt(i, r, 0).phase).toBe("land");
    expect(massingAt(i, r, start("permits")).phase).toBe("permits");
  });
  it("frames floors through the structure stage and is fully framed after it", () => {
    const mid = massingAt(i, r, start("structure") + 2);
    expect(mid.phase).toBe("structure");
    expect(mid.framed).toBeGreaterThan(0);
    expect(mid.framed).toBeLessThan(mid.floors);
    expect(mid.crane).toBe(true);
    expect(massingAt(i, r, end("structure")).framed).toBe(mid.floors);
  });
  it("never clads more floors than are framed, and only grows", () => {
    let prev = massingAt(i, r, 0);
    for (let m = 1; m <= r.exitMonth; m++) {
      const s = massingAt(i, r, m);
      expect(s.clad).toBeLessThanOrEqual(s.framed + 1e-9);
      expect(s.framed).toBeGreaterThanOrEqual(prev.framed);
      expect(s.clad).toBeGreaterThanOrEqual(prev.clad);
      prev = s;
    }
  });
  it("is complete, crane gone, and leasing after handover", () => {
    const s = massingAt(i, r, r.completionMonth + 1);
    expect(s.clad).toBe(s.floors);
    expect(s.landscaped).toBe(1);
    expect(s.crane).toBe(false);
    expect(s.phase).toBe("leaseUp");
    expect(s.occupancy).toBeGreaterThan(0);
    expect(massingAt(i, r, r.exitMonth).phase).toBe("operating");
    expect(massingAt(i, r, r.exitMonth).occupancy).toBeCloseTo(i.occupancy);
  });
  it("clamps months outside the timeline", () => {
    expect(massingAt(i, r, -5).month).toBe(0);
    expect(massingAt(i, r, 9999).month).toBe(r.exitMonth);
  });
});
