import { describe, expect, it } from "vitest";
import { DEFAULTS, NO_SHOCKS, STAGES, areas, drawShocks, irr, monteCarlo, npv, percentile, rng, sensitivity, simulate, type Inputs } from "./engine";

const base: Inputs = DEFAULTS.residential;

describe("finance primitives", () => {
  it("IRR of a one-month 10% gain annualises correctly", () => {
    expect(irr([-100, 110])).toBeCloseTo(1.1 ** 12 - 1, 6);
  });
  it("IRR is null when flows never change sign", () => {
    expect(irr([100, 100])).toBeNull();
    expect(irr([-100, -1])).toBeNull();
  });
  it("NPV at the IRR is zero", () => {
    const flows = [-1000, 50, 50, 50, 1100];
    const r = irr(flows)!;
    expect(npv(flows, r)).toBeCloseTo(0, 4);
  });
  it("percentile interpolates", () => {
    expect(percentile([0, 10], 0.5)).toBe(5);
    expect(percentile([1, 2, 3, 4, 5], 0.9)).toBeCloseTo(4.6);
  });
  it("seeded RNG is deterministic and in [0,1)", () => {
    const a = rng(7), b = rng(7);
    const xs = Array.from({ length: 1000 }, () => a());
    expect(xs).toEqual(Array.from({ length: 1000 }, () => b()));
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs)).toBeLessThan(1);
  });
});

describe("stage weights", () => {
  it("soft and hard cost shares each sum to 100%", () => {
    expect(STAGES.reduce((s, x) => s + x.soft, 0)).toBeCloseTo(1, 10);
    expect(STAGES.reduce((s, x) => s + x.hard, 0)).toBeCloseTo(1, 10);
  });
});

describe("simulate (base case)", () => {
  const r = simulate(base);
  const { gfa } = areas(base);

  it("spend reconciles to land + soft + hard", () => {
    const spent = r.months.reduce((s, m) => s + m.cost, 0);
    expect(spent).toBeCloseTo(r.landCost + r.softCost + r.hardCost, 2);
    expect(r.landCost).toBeCloseTo(base.landArea * base.landPrice * (1 + base.transferTax), 2);
    expect(r.hardCost).toBeCloseTo(gfa * base.hardCost * (1 + base.contingencyPct), 2);
    expect(r.softCost).toBeCloseTo(gfa * base.hardCost * base.softCostPct, 2);
  });

  it("timeline: exit = completion + lease-up + hold", () => {
    expect(r.exitMonth).toBe(r.completionMonth + base.leaseUpMonths + base.holdMonths);
    expect(r.months).toHaveLength(r.exitMonth + 1);
  });

  it("equity goes in first, at least (1 - LTC) of development cost", () => {
    const devExFin = r.landCost + r.softCost + r.hardCost;
    expect(r.peakEquity).toBeGreaterThanOrEqual(devExFin * (1 - base.ltc) - 1);
    const firstDebt = r.months.find((m) => m.debt > 0)!.m;
    const equityDone = r.months.filter((m) => m.equity > 0).at(-1)!.m;
    expect(equityDone).toBeLessThanOrEqual(firstDebt);
  });

  it("debt is fully repaid at exit", () => {
    expect(r.months.at(-1)!.debt).toBe(0);
  });

  it("yield on cost and spread are consistent", () => {
    expect(r.yieldOnCost).toBeCloseTo(r.stabilisedNoi / r.totalCost, 10);
    expect(r.spreadBps).toBe(Math.round((r.yieldOnCost - base.exitCap) * 10_000));
  });

  it("residual land value: buying at it earns about the target profit", () => {
    const rlvPerM2 = r.residualLandValue / base.landArea;
    const check = simulate({ ...base, landPrice: rlvPerM2 });
    // Finance cost moves with the land price, so allow a small tolerance.
    expect(check.profitOnCost).toBeGreaterThan(base.targetProfit - 0.02);
    expect(check.profitOnCost).toBeLessThan(base.targetProfit + 0.02);
  });

  it("levered IRR beats unlevered when the yield exceeds the interest rate", () => {
    if (r.yieldOnCost > base.interest) expect(r.leveredIrr!).toBeGreaterThan(r.unleveredIrr!);
  });
});

describe("direction of effects", () => {
  const v = (x: Partial<Inputs>) => simulate({ ...base, ...x }).leveredIrr!;
  it("more rent, higher IRR; more cost, lower IRR; higher exit cap, lower IRR", () => {
    expect(v({ rent: base.rent * 1.1 })).toBeGreaterThan(v({}));
    expect(v({ hardCost: base.hardCost * 1.1 })).toBeLessThan(v({}));
    expect(v({ exitCap: base.exitCap + 0.005 })).toBeLessThan(v({}));
  });
  it("delays cost money", () => {
    const delayed = simulate(base, { ...NO_SHOCKS, delay: STAGES.map((_, k) => (k === 7 ? 6 : 0)) });
    expect(delayed.completionMonth).toBe(simulate(base).completionMonth + 6);
    expect(delayed.financeCost).toBeGreaterThan(simulate(base).financeCost);
  });
  it("every programme default produces a finite result", () => {
    for (const d of Object.values(DEFAULTS)) {
      const res = simulate(d);
      expect(Number.isFinite(res.totalCost) && Number.isFinite(res.exitValue)).toBe(true);
    }
  });
});

describe("risk", () => {
  it("shock draws never make a stage shorter than one month", () => {
    const r = rng(1);
    for (let n = 0; n < 2000; n++) {
      const s = drawShocks({ ...base, coordination: "fragmented" }, r);
      const res = simulate(base, s);
      for (const st of res.schedule) expect(st.months).toBeGreaterThanOrEqual(1);
    }
  });
  it("Monte Carlo is deterministic for a seed and ordered P10 <= P50 <= P90", () => {
    const a = monteCarlo(base, 300, 42), b = monteCarlo(base, 300, 42);
    expect(a.irr.p50).toBe(b.irr.p50);
    expect(a.irr.p10).toBeLessThanOrEqual(a.irr.p50);
    expect(a.irr.p50).toBeLessThanOrEqual(a.irr.p90);
    expect(a.completion.p10).toBeLessThanOrEqual(a.completion.p90);
    expect(a.probTarget).toBeGreaterThanOrEqual(0);
    expect(a.probTarget).toBeLessThanOrEqual(1);
  });
  it("the coordination assumption shifts the delivery risk the way it says", () => {
    const integ = monteCarlo({ ...base, coordination: "integrated" }, 600, 9);
    const frag = monteCarlo({ ...base, coordination: "fragmented" }, 600, 9);
    expect(integ.completion.p90).toBeLessThanOrEqual(frag.completion.p90);
    expect(integ.irr.p50).toBeGreaterThan(frag.irr.p50);
  });
  it("runs 1,000 scenarios fast enough for live input (< 400 ms)", () => {
    const t0 = performance.now();
    monteCarlo(base, 1000);
    expect(performance.now() - t0).toBeLessThan(400);
  });
});

describe("sensitivity", () => {
  it("rows are sorted by swing and bracket the base on the expected side", () => {
    const s = sensitivity(base);
    const swings = s.rows.map((r) => Math.abs(r.high - r.low));
    expect(swings).toEqual([...swings].sort((a, b) => b - a));
    for (const r of s.rows) {
      expect([r.key, r.low <= s.base + 1e-9]).toEqual([r.key, true]);
      expect([r.key, r.high >= s.base - 1e-9]).toEqual([r.key, true]);
    }
  });
});
