import { useDeferredValue, useEffect, useId, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button, PageHeader } from "../../design/ui";
import type { Language } from "../../i18n";
import { CONSTRUCTION_FROM, monteCarlo, sensitivity, simulate, type Coordination, type Inputs, type Programme } from "./engine";
import { GROUPS, decodeScenario, defaultsFor, encodeScenario, type FieldSpec } from "./fields";
import { CashLine, Gantt, Histogram, Tornado } from "./charts";

const PROGRAMMES: Programme[] = ["residential", "hospitality", "mixedUse"];

function useFormat(lang: Language) {
  return useMemo(() => {
    const loc = lang === "ar" ? "ar-SA-u-nu-latn" : "en-US";
    const n0 = new Intl.NumberFormat(loc, { maximumFractionDigits: 0 });
    const n1 = new Intl.NumberFormat(loc, { maximumFractionDigits: 1 });
    const sar = lang === "ar" ? "ريال" : "SAR";
    const money = (v: number) => {
      const a = Math.abs(v);
      const s = a >= 1e6 ? `${n1.format(v / 1e6)}${lang === "ar" ? " مليون" : "M"}` : a >= 1e3 ? `${n0.format(v / 1e3)}${lang === "ar" ? " ألف" : "K"}` : n0.format(v);
      return lang === "ar" ? `${s} ${sar}` : `${sar} ${s}`;
    };
    const pct = (v: number | null, digits = 1) =>
      v === null || !Number.isFinite(v) ? "—" : `${new Intl.NumberFormat(loc, { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(v * 100)}%`;
    return { money, pct, n0, n1 };
  }, [lang]);
}

function NumberField({ spec, value, onChange }: { spec: FieldSpec; value: number; onChange: (v: number) => void }) {
  const { t } = useTranslation();
  const id = useId();
  const shown = +(value * spec.scale).toFixed(4);
  const [text, setText] = useState(String(shown));
  const [error, setError] = useState(false);
  // Follow external changes (reset, programme switch) without fighting the user's typing.
  useEffect(() => { setText(String(shown)); setError(false); }, [shown]);

  const commit = (raw: string) => {
    setText(raw);
    const v = Number(raw.replace(/[,٬\s]/g, "").replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x660)));
    if (raw.trim() === "" || !Number.isFinite(v) || v < spec.min || v > spec.max) { setError(true); return; }
    setError(false);
    onChange(v / spec.scale);
  };

  return (
    <div className="grid gap-1">
      <label htmlFor={id} className="text-sm">{t(`studio.fields.${spec.key}`)}</label>
      <div className="flex items-stretch">
        <input
          id={id}
          dir="ltr"
          inputMode="decimal"
          className="min-h-11 w-full min-w-0 rounded-s-sm border border-line bg-surface px-3 text-fg aria-[invalid=true]:border-danger"
          value={text}
          aria-invalid={error}
          aria-describedby={`${id}-help`}
          onChange={(e) => commit(e.target.value)}
          onBlur={() => { if (error) { setText(String(shown)); setError(false); } }}
        />
        <span className="flex min-w-16 items-center justify-center rounded-e-sm border border-s-0 border-line px-2 text-xs text-muted">{t(`studio.units.${spec.unit}`)}</span>
      </div>
      <p id={`${id}-help`} className="min-h-4 text-xs text-muted" aria-live="polite">
        {error ? <span className="text-danger">{t("errors.number", { min: spec.min, max: spec.max })}</span> : spec.hint ? t(`studio.hints.${spec.key}`) : ""}
      </p>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="border-t border-line pt-3">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 text-2xl font-light tabular-nums">{value}</dd>
      {hint && <dd className="mt-1 text-xs text-muted">{hint}</dd>}
    </div>
  );
}

export function StudioPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Language;
  const f = useFormat(lang);
  const [params, setParams] = useSearchParams();
  const [inputs, setInputs] = useState<Inputs>(() => decodeScenario(params.get("s")) ?? defaultsFor("residential"));

  // Keep the scenario in the URL so it can be bookmarked or shared (no personal data in it).
  useEffect(() => {
    const id = setTimeout(() => setParams({ s: encodeScenario(inputs) }, { replace: true }), 300);
    return () => clearTimeout(id);
  }, [inputs, setParams]);

  const deferred = useDeferredValue(inputs);
  const stale = deferred !== inputs;
  const res = useMemo(() => simulate(deferred), [deferred]);
  const risk = useMemo(() => monteCarlo(deferred, 1000), [deferred]);
  const sens = useMemo(() => sensitivity(deferred), [deferred]);

  const set = (k: keyof Inputs) => (v: number | string) => setInputs((p) => ({ ...p, [k]: v }));
  const cumulative = useMemo(() => {
    let c = 0;
    return res.months.map((m) => (c += m.levered));
  }, [res]);

  const spread = res.spreadBps;
  const metricFmt = (v: number) => f.pct(v, 1);
  const consultHref = `/consultation?type=${inputs.programme}&size=${Math.round(res.gfa)}`;

  return (
    <div>
      <PageHeader eyebrow={t("studio.eyebrow")} title={t("studio.title")} accent={t("studio.accent")}>
        <p className="mt-6 max-w-2xl text-lg text-muted">{t("studio.lede")}</p>
      </PageHeader>
      <p role="note" className="mb-10 max-w-2xl border-s-2 border-line ps-4 text-sm text-muted">{t("studio.disclaimer")}</p>

      {/* Phone and tablet: inputs come first, so keep the headline result in view while editing. */}
      <div className="sticky top-0 z-20 -mx-4 mb-6 flex items-center justify-between gap-4 border-b border-line bg-bg px-4 py-3 lg:hidden" aria-hidden="true">
        <span className="eyebrow">{t("studio.summary")}</span>
        <span className="flex gap-5 text-sm tabular-nums">
          <span><span className="text-muted">{t("studio.kpi.leveredIrr")} </span>{res.leveredIrr === null ? "—" : f.pct(res.leveredIrr)}</span>
          <span><span className="text-muted">{t("studio.kpi.profitOnCost")} </span>{f.pct(res.profitOnCost)}</span>
        </span>
      </div>

      <div className="grid gap-10 lg:grid-cols-[20rem_1fr]">
        {/* ---------------- Inputs ---------------- */}
        <form className="grid content-start gap-8" onSubmit={(e) => e.preventDefault()} aria-label={t("studio.title")}>
          <fieldset>
            <legend className="eyebrow mb-3">{t("studio.groups.project")}</legend>
            <div role="group" className="mb-4 flex flex-wrap gap-2">
              {PROGRAMMES.map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={inputs.programme === p}
                  onClick={() => setInputs({ ...defaultsFor(p), coordination: inputs.coordination })}
                  className={`min-h-11 rounded-sm border px-3 text-sm ${inputs.programme === p ? "border-primary bg-primary text-on-primary" : "border-line"}`}
                >
                  {t(`studio.programme.${p}`)}
                </button>
              ))}
            </div>
            <div className="grid gap-2">
              {GROUPS[0].fields.map((s) => <NumberField key={s.key} spec={s} value={inputs[s.key]} onChange={set(s.key)} />)}
            </div>
          </fieldset>

          {GROUPS.slice(1).map((g) => (
            <fieldset key={g.key}>
              <legend className="eyebrow mb-3">{t(`studio.groups.${g.key}`)}</legend>
              <div className="grid gap-2">
                {g.fields.map((s) => <NumberField key={s.key} spec={s} value={inputs[s.key]} onChange={set(s.key)} />)}
              </div>
            </fieldset>
          ))}

          <fieldset>
            <legend className="eyebrow mb-3">{t("studio.coordination.legend")}</legend>
            <div className="grid gap-2">
              {(["integrated", "fragmented"] as Coordination[]).map((c) => (
                <label key={c} className="flex min-h-11 items-center gap-3">
                  <input type="radio" name="coordination" className="h-5 w-5 accent-[var(--color-primary)]" checked={inputs.coordination === c} onChange={() => set("coordination")(c)} />
                  {t(`studio.coordination.${c}`)}
                </label>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">{t("studio.coordination.assumption")}</p>
          </fieldset>

          <Button type="button" variant="ghost" onClick={() => setInputs(defaultsFor(inputs.programme))}>{t("studio.reset")}</Button>
        </form>

        {/* ---------------- Results ---------------- */}
        <div className={`grid min-w-0 content-start gap-14 transition-opacity ${stale ? "opacity-70" : ""}`} aria-busy={stale}>
          <section aria-label={t("studio.title")}>
            <dl data-testid="studio-kpis" className="grid grid-cols-2 gap-x-6 gap-y-6 xl:grid-cols-4" aria-live="polite">
              <Kpi label={t("studio.kpi.leveredIrr")} value={res.leveredIrr === null ? t("studio.kpi.na") : f.pct(res.leveredIrr)} />
              <Kpi label={t("studio.kpi.profitOnCost")} value={f.pct(res.profitOnCost)} />
              <Kpi
                label={t("studio.kpi.yieldOnCost")}
                value={f.pct(res.yieldOnCost, 2)}
                hint={t(spread >= 0 ? "studio.kpi.spread" : "studio.kpi.spreadNeg", { bps: f.n0.format(Math.abs(spread)) })}
              />
              <Kpi label={t("studio.kpi.rlv")} value={f.money(res.residualLandValue)} hint={t("studio.kpi.rlvHint", { target: f.pct(inputs.targetProfit, 0) })} />
              <Kpi label={t("studio.kpi.totalCost")} value={f.money(res.totalCost)} hint={`${t("studio.kpi.gfa")}: ${f.n0.format(res.gfa)} ${t("studio.units.m2")}`} />
              <Kpi label={t("studio.kpi.exitValue")} value={f.money(res.exitValue)} />
              <Kpi label={t("studio.kpi.peakEquity")} value={f.money(res.peakEquity)} hint={`${t("studio.kpi.peakDebt")}: ${f.money(res.peakDebt)}`} />
              <Kpi label={t("studio.kpi.completion")} value={t("studio.kpi.completionValue", { m: res.completionMonth })} />
              <Kpi label={t("studio.kpi.unleveredIrr")} value={res.unleveredIrr === null ? t("studio.kpi.na") : f.pct(res.unleveredIrr)} />
              <Kpi label={t("studio.kpi.equityMultiple")} value={`${f.n1.format(res.equityMultiple)}×`} />
              <Kpi label={t("studio.kpi.dscr")} value={res.dscr === null ? t("studio.kpi.na") : `${f.n1.format(res.dscr)}×`} />
              <Kpi label={t("studio.kpi.npv", { rate: f.pct(inputs.discountRate, 0) })} value={f.money(res.npv)} />
            </dl>
          </section>

          <section aria-labelledby="risk-h">
            <h2 id="risk-h" className="mb-1 text-xl font-light">{t("studio.risk.title")}</h2>
            <p className="mb-6 text-sm text-muted">{t("studio.risk.lede")}</p>
            <dl className="mb-6 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
              <Kpi label={t("studio.risk.p10")} value={f.pct(risk.irr.p10)} />
              <Kpi label={t("studio.risk.p50")} value={f.pct(risk.irr.p50)} />
              <Kpi label={t("studio.risk.p90")} value={f.pct(risk.irr.p90)} />
              <Kpi label={t("studio.risk.completionRange")} value={t("studio.risk.months", { a: Math.round(risk.completion.p10), b: Math.round(risk.completion.p90) })} />
              <Kpi label={t("studio.risk.target", { target: f.pct(inputs.targetProfit, 0) })} value={f.pct(risk.probTarget, 0)} />
              <Kpi label={t("studio.risk.loss")} value={f.pct(risk.probLoss, 0)} />
            </dl>
            <Histogram
              samples={risk.irr.samples}
              format={(v) => f.pct(v, 0)}
              title={t("studio.risk.histogram")}
              tableLabel={t("studio.table")}
              binLabel={(a, b) => t("studio.risk.bin", { a, b })}
              markers={[{ value: risk.irr.p10, label: "P10" }, { value: risk.irr.p50, label: "P50" }, { value: risk.irr.p90, label: "P90" }]}
            />
          </section>

          <section aria-labelledby="cash-h">
            <h2 id="cash-h" className="mb-1 text-xl font-light">{t("studio.cash.title")}</h2>
            <p className="mb-4 text-sm text-muted">{t("studio.cash.lede")}</p>
            <CashLine
              values={cumulative}
              format={f.money}
              title={t("studio.cash.title")}
              tableLabel={t("studio.table")}
              monthLabel={(m) => t("studio.cash.month", { m })}
              positionLabel={t("studio.cash.position")}
              events={[{ m: res.completionMonth, label: t("studio.cash.completion") }, { m: res.exitMonth, label: t("studio.cash.exit") }]}
            />
          </section>

          <section aria-labelledby="time-h">
            <h2 id="time-h" className="mb-1 text-xl font-light">{t("studio.timeline.title")}</h2>
            <p className="mb-4 text-sm text-muted">{t("studio.timeline.total", { n: res.completionMonth })}</p>
            <Gantt
              stages={res.schedule.map((s, k) => ({ ...s, construction: k >= CONSTRUCTION_FROM }))}
              total={res.completionMonth}
              title={t("studio.timeline.title")}
              tableLabel={t("studio.table")}
              labelFor={(k) => t(`studio.stages.${k}`)}
              monthsLabel={(n) => t("studio.timeline.months", { n })}
              legend={{ design: t("studio.timeline.design"), construction: t("studio.timeline.construction") }}
            />
          </section>

          <section aria-labelledby="sens-h">
            <h2 id="sens-h" className="mb-1 text-xl font-light">{t("studio.sens.title")}</h2>
            <p className="mb-4 text-sm text-muted">
              {t("studio.sens.lede")} ({t(sens.metric === "irr" ? "studio.sens.metricIrr" : "studio.sens.metricPoc")})
            </p>
            <Tornado
              rows={sens.rows.map((r) => ({ ...r, label: t(`studio.sens.rows.${r.key}`) }))}
              base={sens.base}
              format={metricFmt}
              title={t("studio.sens.title")}
              tableLabel={t("studio.table")}
              labels={{ downside: t("studio.sens.downside"), upside: t("studio.sens.upside"), base: t("studio.sens.base", { v: metricFmt(sens.base) }) }}
            />
          </section>

          <section aria-labelledby="learn-h">
            <h2 id="learn-h" className="eyebrow mb-4">{t("studio.learn.title")}</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {(t("studio.learn.items", { returnObjects: true }) as string[]).map((s) => (
                <li key={s} className="border-t border-line pt-3 text-sm text-muted">{s}</li>
              ))}
            </ul>
          </section>

          <div className="rounded-md border border-line p-6">
            <Link to={consultHref} className="inline-flex min-h-11 items-center rounded-sm bg-primary px-6 text-sm text-on-primary">
              {t("studio.discuss")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

