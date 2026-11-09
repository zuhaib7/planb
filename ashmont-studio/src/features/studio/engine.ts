/**
 * Development feasibility engine.
 *
 * A monthly cash-flow model of one development, from land purchase through
 * Ashmont's design stages, permits, construction, lease-up and exit, plus a
 * seeded Monte Carlo of delivery risk and a one-at-a-time sensitivity.
 *
 * Pure functions, no DOM, no randomness without a seed: same inputs, same output.
 * All figures are illustrative and depend on the user's assumptions.
 */

export type Programme = "residential" | "hospitality" | "mixedUse";
export type Coordination = "integrated" | "fragmented";

export interface Inputs {
  programme: Programme;
  landArea: number; // m²
  far: number; // floor area ratio: GFA / land area
  efficiency: number; // net lettable / gross, 0-1
  landPrice: number; // SAR per m² of land
  transferTax: number; // share of land price (KSA real estate transaction tax)
  hardCost: number; // SAR per m² GFA
  softCostPct: number; // design, permits, fees, share of hard cost
  contingencyPct: number; // share of hard cost
  rent: number; // SAR per m² NLA per year (net revenue for hospitality)
  occupancy: number; // stabilised, 0-1
  opexPct: number; // share of gross income
  leaseUpMonths: number;
  holdMonths: number; // after stabilisation, before exit
  exitCap: number; // e.g. 0.07
  sellCostPct: number; // agency and legal, share of exit value
  ltc: number; // loan to cost, 0-1
  interest: number; // annual
  discountRate: number; // annual, for NPV
  targetProfit: number; // required profit on cost, for residual land value
  coordination: Coordination;
}

export interface Stage {
  key: string;
  months: number;
  /** share of soft cost (design phases) or hard cost (construction phases) */
  soft: number;
  hard: number;
  permit?: boolean;
}

/** Ashmont's process (website version) followed by construction. */
export const STAGES: Stage[] = [
  { key: "preConcept", months: 1, soft: 0.08, hard: 0 },
  { key: "concept", months: 2, soft: 0.17, hard: 0 },
  { key: "coordination", months: 2, soft: 0.2, hard: 0 },
  { key: "detailed", months: 3, soft: 0.3, hard: 0 },
  { key: "permits", months: 3, soft: 0.1, hard: 0, permit: true },
  { key: "tender", months: 2, soft: 0.05, hard: 0 },
  { key: "foundation", months: 3, soft: 0.02, hard: 0.12 },
  { key: "structure", months: 7, soft: 0.03, hard: 0.38 },
  { key: "mep", months: 5, soft: 0.02, hard: 0.24 },
  { key: "finishing", months: 5, soft: 0.02, hard: 0.21 },
  { key: "handover", months: 1, soft: 0.01, hard: 0.05 },
];

export const CONSTRUCTION_FROM = STAGES.findIndex((s) => s.key === "foundation");

/** Example assumptions per programme. Illustrative only: users replace them with their own. */
export const DEFAULTS: Record<Programme, Inputs> = {
  residential: {
    programme: "residential", landArea: 5000, far: 2.0, efficiency: 0.8, landPrice: 2500, transferTax: 0.05,
    hardCost: 3200, softCostPct: 0.1, contingencyPct: 0.07, rent: 800, occupancy: 0.92, opexPct: 0.2,
    leaseUpMonths: 9, holdMonths: 24, exitCap: 0.07, sellCostPct: 0.02, ltc: 0.55, interest: 0.075,
    discountRate: 0.11, targetProfit: 0.18, coordination: "integrated",
  },
  hospitality: {
    programme: "hospitality", landArea: 4000, far: 1.8, efficiency: 0.7, landPrice: 3000, transferTax: 0.05,
    hardCost: 4800, softCostPct: 0.12, contingencyPct: 0.08, rent: 2400, occupancy: 0.72, opexPct: 0.4,
    leaseUpMonths: 12, holdMonths: 36, exitCap: 0.08, sellCostPct: 0.02, ltc: 0.5, interest: 0.075,
    discountRate: 0.12, targetProfit: 0.2, coordination: "integrated",
  },
  mixedUse: {
    programme: "mixedUse", landArea: 6800, far: 3.0, efficiency: 0.78, landPrice: 3500, transferTax: 0.05,
    hardCost: 3800, softCostPct: 0.11, contingencyPct: 0.07, rent: 1000, occupancy: 0.9, opexPct: 0.22,
    leaseUpMonths: 12, holdMonths: 24, exitCap: 0.0725, sellCostPct: 0.02, ltc: 0.55, interest: 0.075,
    discountRate: 0.11, targetProfit: 0.18, coordination: "integrated",
  },
};

/** Monthly risk-event probabilities. Coordination scales them; it is a user assumption, not a claim. */
export const RISK = {
  base: 0.1, // chance per active month of a delivery event
  integratedMult: 0.65,
  fragmentedMult: 1.4,
  permitDelay: 2, // months
  labourDelay: 1,
  materialSpike: 0.06, // share of remaining hard cost
  marketVol: 0.025, // monthly rent drift sd
  capVol: 0.004, // exit cap sd (absolute)
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Mulberry32: small, fast, seeded PRNG. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(r: () => number) {
  const u = Math.max(r(), 1e-12), v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Monthly IRR by bisection on NPV, annualised. Null when cash flows never change sign. */
export function irr(flows: number[]): number | null {
  if (!flows.some((f) => f < 0) || !flows.some((f) => f > 0)) return null;
  const npv = (r: number) => flows.reduce((s, f, i) => s + f / (1 + r) ** i, 0);
  let lo = -0.99, hi = 1;
  let fLo = npv(lo), fHi = npv(hi);
  if (fLo * fHi > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid);
    if (Math.abs(fMid) < 1e-6) { lo = hi = mid; break; }
    if (fLo * fMid < 0) { hi = mid; fHi = fMid; } else { lo = mid; fLo = fMid; }
  }
  return (1 + (lo + hi) / 2) ** 12 - 1;
}

export function npv(flows: number[], annualRate: number): number {
  const m = (1 + annualRate) ** (1 / 12) - 1;
  return flows.reduce((s, f, i) => s + f / (1 + m) ** i, 0);
}

export function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return NaN;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

// ---------------------------------------------------------------------------
// Core simulation
// ---------------------------------------------------------------------------

export interface Shocks {
  /** extra months added to stage i */
  delay: number[];
  /** multiplier on hard cost from month m onward is applied via costMult at stage level */
  costMult: number[];
  /** rent factor at stabilisation */
  rentFactor: number;
  /** absolute change to exit cap */
  capShift: number;
}

export const NO_SHOCKS: Shocks = { delay: STAGES.map(() => 0), costMult: STAGES.map(() => 1), rentFactor: 1, capShift: 0 };

export interface Month {
  m: number;
  stage: string | null;
  cost: number; // development spend this month (land, soft, hard, contingency)
  interest: number; // capitalised during development, paid after
  noi: number;
  sale: number;
  debt: number; // closing balance
  equity: number; // equity contributed this month (positive = in)
  unlevered: number; // project cash flow
  levered: number; // equity cash flow
}

export interface Result {
  gfa: number;
  nla: number;
  months: Month[];
  schedule: { key: string; start: number; months: number }[];
  completionMonth: number;
  stabilisedMonth: number;
  exitMonth: number;
  landCost: number;
  softCost: number;
  hardCost: number;
  financeCost: number;
  totalCost: number;
  stabilisedNoi: number;
  exitValue: number;
  profit: number;
  profitOnCost: number;
  yieldOnCost: number;
  spreadBps: number;
  residualLandValue: number;
  peakDebt: number;
  peakEquity: number;
  unleveredIrr: number | null;
  leveredIrr: number | null;
  npv: number;
  equityMultiple: number;
  dscr: number | null;
}

export function areas(i: Inputs) {
  const gfa = i.landArea * i.far;
  return { gfa, nla: gfa * i.efficiency };
}

/** Construction stages take longer on bigger projects (sub-linear). */
export function sizeFactor(gfa: number) {
  return Math.min(2, Math.max(0.75, (gfa / 10_000) ** 0.3));
}

export function simulate(i: Inputs, shocks: Shocks = NO_SHOCKS): Result {
  const { gfa, nla } = areas(i);
  const sf = sizeFactor(gfa);
  const landCost = i.landArea * i.landPrice * (1 + i.transferTax);
  const hardBase = gfa * i.hardCost * (1 + i.contingencyPct);
  const softBase = gfa * i.hardCost * i.softCostPct;

  // Schedule
  const schedule: { key: string; start: number; months: number }[] = [];
  let t = 1; // month 0 = land
  STAGES.forEach((s, k) => {
    const base = k >= CONSTRUCTION_FROM ? Math.max(1, Math.round(s.months * sf)) : s.months;
    const months = Math.max(1, base + shocks.delay[k]);
    schedule.push({ key: s.key, start: t, months });
    t += months;
  });
  const completionMonth = t - 1;
  const stabilisedMonth = completionMonth + i.leaseUpMonths;
  const exitMonth = stabilisedMonth + i.holdMonths;

  // Costs per month (excluding finance)
  const cost = new Array(exitMonth + 1).fill(0);
  cost[0] = landCost;
  let softCost = 0, hardCost = 0;
  STAGES.forEach((s, k) => {
    const { start, months } = schedule[k];
    const soft = softBase * s.soft, hard = hardBase * s.hard * shocks.costMult[k];
    softCost += soft;
    hardCost += hard;
    for (let m = start; m < start + months; m++) cost[m] += (soft + hard) / months;
  });
  const devCostExFinance = landCost + softCost + hardCost;
  const equityTarget = devCostExFinance * (1 - i.ltc);

  // Income
  const grossStab = nla * i.rent * shocks.rentFactor * i.occupancy;
  const stabilisedNoi = grossStab * (1 - i.opexPct);
  const exitCap = Math.max(0.03, i.exitCap + shocks.capShift);
  const exitValue = stabilisedNoi / exitCap;

  const months: Month[] = [];
  const rM = i.interest / 12;
  let debt = 0, equityIn = 0, peakDebt = 0;
  for (let m = 0; m <= exitMonth; m++) {
    const operating = m > completionMonth;
    const ramp = operating ? Math.min(1, (m - completionMonth) / Math.max(1, i.leaseUpMonths)) : 0;
    const noi = operating ? (stabilisedNoi / 12) * ramp : 0;
    const interest = debt * rM;

    // Fund spend: equity first, then debt. Interest capitalises until income covers it.
    let need = cost[m];
    let equity = 0;
    if (!operating) {
      need += interest;
      const fromEquity = Math.min(need, Math.max(0, equityTarget - equityIn));
      equity = fromEquity;
      equityIn += fromEquity;
      debt += need - fromEquity;
    }
    let levered = -equity;
    if (operating) {
      // Interest paid from NOI; any shortfall is funded by equity.
      const net = noi - interest - cost[m];
      levered = net;
      if (net < 0) equityIn += -net;
    }
    let sale = 0;
    if (m === exitMonth) {
      sale = exitValue * (1 - i.sellCostPct);
      levered += sale - debt;
      debt = 0;
    }
    peakDebt = Math.max(peakDebt, debt);
    const unlevered = -cost[m] + noi + sale;
    months.push({ m, stage: m === 0 ? "land" : schedule.find((s) => m >= s.start && m < s.start + s.months)?.key ?? null, cost: cost[m], interest, noi, sale, debt, equity, unlevered, levered });
  }

  // Development-period finance only, for cost metrics
  const devFinance = months.filter((x) => x.m <= completionMonth).reduce((s, x) => s + x.interest, 0);
  const totalCost = devCostExFinance + devFinance;
  const profit = exitValue * (1 - i.sellCostPct) - totalCost;
  const yieldOnCost = stabilisedNoi / totalCost;
  // Residual land value: what the land is worth if the scheme must earn the target profit on cost.
  const nonLand = totalCost - landCost;
  const residualLandValue = Math.max(0, (exitValue * (1 - i.sellCostPct)) / (1 + i.targetProfit) - nonLand) / (1 + i.transferTax);

  const leveredFlows = months.map((x) => x.levered);
  const pos = leveredFlows.filter((f) => f > 0).reduce((s, f) => s + f, 0);
  const neg = -leveredFlows.filter((f) => f < 0).reduce((s, f) => s + f, 0);
  const debtAtStab = months[Math.min(stabilisedMonth, exitMonth)].debt;

  return {
    gfa, nla, months, schedule, completionMonth, stabilisedMonth, exitMonth,
    landCost, softCost, hardCost, financeCost: devFinance, totalCost,
    stabilisedNoi, exitValue, profit, profitOnCost: profit / totalCost, yieldOnCost,
    spreadBps: Math.round((yieldOnCost - exitCap) * 10_000),
    residualLandValue,
    peakDebt,
    peakEquity: equityIn,
    unleveredIrr: irr(months.map((x) => x.unlevered)),
    leveredIrr: irr(leveredFlows),
    npv: npv(months.map((x) => x.unlevered), i.discountRate),
    equityMultiple: neg > 0 ? pos / neg : 0,
    dscr: debtAtStab > 0 ? stabilisedNoi / (debtAtStab * i.interest) : null,
  };
}

// ---------------------------------------------------------------------------
// Risk: Monte Carlo
// ---------------------------------------------------------------------------

export interface RiskEventLog { stage: string; kind: "permit" | "labour" | "material" | "early" }

export function drawShocks(i: Inputs, r: () => number, log?: RiskEventLog[]): Shocks {
  const mult = i.coordination === "integrated" ? RISK.integratedMult : RISK.fragmentedMult;
  const sf = sizeFactor(areas(i).gfa);
  const delay = STAGES.map(() => 0);
  const costMult = STAGES.map(() => 1);
  STAGES.forEach((s, k) => {
    const months = k >= CONSTRUCTION_FROM ? Math.max(1, Math.round(s.months * sf)) : s.months;
    const activeRisk = s.permit || k >= CONSTRUCTION_FROM;
    if (!activeRisk) return;
    for (let m = 0; m < months; m++) {
      if (r() >= RISK.base * mult) continue;
      const roll = r();
      if (s.permit) {
        if (roll < 0.8) { delay[k] += RISK.permitDelay; log?.push({ stage: s.key, kind: "permit" }); }
        else { delay[k] -= months + delay[k] > 1 ? 1 : 0; log?.push({ stage: s.key, kind: "early" }); }
      } else if (roll < 0.45) { delay[k] += RISK.labourDelay; log?.push({ stage: s.key, kind: "labour" }); }
      else if (roll < 0.85) {
        // Price spike on the remaining hard cost: this stage and the ones after it.
        for (let j = k; j < STAGES.length; j++) costMult[j] *= 1 + RISK.materialSpike;
        log?.push({ stage: s.key, kind: "material" });
      } else { delay[k] -= months + delay[k] > 1 ? 1 : 0; log?.push({ stage: s.key, kind: "early" }); }
    }
  });
  // Market: rent random walk over the build, mean-reverting; exit cap noise.
  let rent = 1;
  const span = STAGES.reduce((s, x) => s + x.months, 0);
  for (let m = 0; m < span; m++) rent += normal(r) * RISK.marketVol - (rent - 1) * 0.05;
  return { delay, costMult, rentFactor: Math.max(0.6, Math.min(1.4, rent)), capShift: normal(r) * RISK.capVol };
}

export interface RiskSummary {
  runs: number;
  irr: { p10: number; p50: number; p90: number; samples: number[] };
  profitOnCost: { p10: number; p50: number; p90: number };
  completion: { p10: number; p50: number; p90: number };
  probTarget: number; // chance profit on cost >= target
  probLoss: number; // chance profit < 0
}

export function monteCarlo(i: Inputs, runs = 1000, seed = 2030): RiskSummary {
  const r = rng(seed);
  const irrs: number[] = [], poc: number[] = [], done: number[] = [];
  let hit = 0, loss = 0;
  for (let n = 0; n < runs; n++) {
    const res = simulate(i, drawShocks(i, r));
    if (res.leveredIrr !== null) irrs.push(res.leveredIrr);
    poc.push(res.profitOnCost);
    done.push(res.completionMonth);
    if (res.profitOnCost >= i.targetProfit) hit++;
    if (res.profit < 0) loss++;
  }
  const s = (a: number[]) => [...a].sort((x, y) => x - y);
  const si = s(irrs), sp = s(poc), sd = s(done);
  const q = (a: number[]) => ({ p10: percentile(a, 0.1), p50: percentile(a, 0.5), p90: percentile(a, 0.9) });
  return { runs, irr: { ...q(si), samples: si }, profitOnCost: q(sp), completion: q(sd), probTarget: hit / runs, probLoss: loss / runs };
}

// ---------------------------------------------------------------------------
// Sensitivity
// ---------------------------------------------------------------------------

export interface Sensitivity { key: string; low: number; high: number; lowLabel: string; highLabel: string }

/** One-at-a-time swings on levered IRR (falls back to profit on cost if IRR is undefined). */
export function sensitivity(i: Inputs): { metric: "irr" | "poc"; base: number; rows: Sensitivity[] } {
  const base = simulate(i);
  const metric = base.leveredIrr === null ? "poc" : "irr";
  const val = (x: Inputs, sh: Shocks = NO_SHOCKS) => {
    const res = simulate(x, sh);
    return metric === "irr" ? res.leveredIrr ?? -1 : res.profitOnCost;
  };
  const delayAll = (n: number): Shocks => ({ ...NO_SHOCKS, delay: STAGES.map((_, k) => (k === STAGES.findIndex((s) => s.key === "structure") ? n : 0)) });
  const rows: Sensitivity[] = [
    { key: "rent", low: val({ ...i, rent: i.rent * 0.9 }), high: val({ ...i, rent: i.rent * 1.1 }), lowLabel: "-10%", highLabel: "+10%" },
    { key: "hardCost", low: val({ ...i, hardCost: i.hardCost * 1.1 }), high: val({ ...i, hardCost: i.hardCost * 0.9 }), lowLabel: "+10%", highLabel: "-10%" },
    { key: "exitCap", low: val({ ...i, exitCap: i.exitCap + 0.005 }), high: val({ ...i, exitCap: i.exitCap - 0.005 }), lowLabel: "+50 bps", highLabel: "-50 bps" },
    { key: "delay", low: val(i, delayAll(6)), high: val(i, delayAll(-3)), lowLabel: "+6 mo", highLabel: "-3 mo" },
    { key: "landPrice", low: val({ ...i, landPrice: i.landPrice * 1.1 }), high: val({ ...i, landPrice: i.landPrice * 0.9 }), lowLabel: "+10%", highLabel: "-10%" },
    { key: "interest", low: val({ ...i, interest: i.interest + 0.01 }), high: val({ ...i, interest: i.interest - 0.01 }), lowLabel: "+1 pt", highLabel: "-1 pt" },
    { key: "occupancy", low: val({ ...i, occupancy: Math.max(0, i.occupancy - 0.1) }), high: val({ ...i, occupancy: Math.min(1, i.occupancy + 0.05) }), lowLabel: "-10 pts", highLabel: "+5 pts" },
  ];
  const b = metric === "irr" ? base.leveredIrr ?? -1 : base.profitOnCost;
  rows.sort((a, c) => Math.abs(c.high - c.low) - Math.abs(a.high - a.low));
  return { metric, base: b, rows };
}
