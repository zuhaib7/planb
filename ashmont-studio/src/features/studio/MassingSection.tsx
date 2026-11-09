import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Skeleton } from "../../design/ui";
import { detectDeviceTier } from "../../lib/device";
import { useSettings } from "../../lib/settings";
import type { Inputs, Result } from "./engine";
import { COVERAGE, massingAt, type MassingState } from "./massing";

const MassingScene = lazy(() => import("./MassingScene"));

/** 2D elevation: the fallback without WebGL or with data saver, and a quick read for everyone else. */
function Elevation({ st, label }: { st: MassingState; label: string }) {
  const W = 320, H = 200, ground = H - 16;
  const scale = Math.min((W - 40) / st.plotSide, (ground - 12) / (st.floors * st.floorHeight || 1));
  const fw = st.footprintSide * scale, fh = st.floorHeight * scale, x0 = (W - fw) / 2;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-md" role="img" aria-label={label}>
      <line x1={(W - st.plotSide * scale) / 2} x2={(W + st.plotSide * scale) / 2} y1={ground} y2={ground} stroke="var(--color-fg-muted)" strokeWidth={2} />
      {Array.from({ length: st.floors }, (_, k) => {
        const framed = st.framed >= k + 1, clad = st.clad >= k + 1;
        if (!framed && st.framed <= k) return <rect key={k} x={x0} y={ground - (k + 1) * fh} width={fw} height={fh - 1} fill="none" stroke="var(--viz-grid)" strokeDasharray="2 3" />;
        return <rect key={k} x={x0} y={ground - (k + 1) * fh} width={framed ? fw : fw * (st.framed - k)} height={fh - 1} rx={1} fill={clad ? "var(--viz-1)" : "var(--viz-2)"} opacity={clad ? 1 : 0.55} />;
      })}
    </svg>
  );
}

export function MassingSection({ inputs, res, cumulative, money }: { inputs: Inputs; res: Result; cumulative: number[]; money: (v: number) => string }) {
  const { t } = useTranslation();
  const { dataSaver, reducedMotion } = useSettings();
  const tier = useMemo(() => detectDeviceTier(), []);
  const use3d = tier !== "none" && !dataSaver;
  const [month, setMonth] = useState(() => Math.round(res.completionMonth * 0.6));
  const [playing, setPlaying] = useState(false);
  const m = Math.min(month, res.exitMonth);
  const st = useMemo(() => massingAt(inputs, res, m), [inputs, res, m]);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setMonth((x) => Math.min(x + 1, res.exitMonth)), reducedMotion ? 600 : 280);
    return () => clearInterval(id);
  }, [playing, res.exitMonth, reducedMotion]);
  // Stop at the end of the timeline.
  useEffect(() => { if (playing && m >= res.exitMonth) setPlaying(false); }, [playing, m, res.exitMonth]);

  const spent = useMemo(() => res.months.slice(0, m + 1).reduce((s, x) => s + x.cost, 0), [res, m]);
  const phase = t(`studio.massing.phase.${st.phase}`);
  const description =
    t("studio.massing.describe", { m, total: res.exitMonth, phase, framed: Math.floor(st.framed), floors: st.floors, clad: Math.floor(st.clad) }) +
    (st.occupancy > 0 ? ` ${t("studio.massing.occupied", { pct: `${Math.round(st.occupancy * 100)}%` })}` : "");

  return (
    <section aria-labelledby="massing-h">
      <h2 id="massing-h" className="mb-1 text-xl font-light">{t("studio.massing.title")}</h2>
      <p className="mb-4 text-sm text-muted">{t("studio.massing.lede")}</p>

      {use3d ? (
        <Suspense fallback={<Skeleton className="aspect-[16/10] w-full" />}>
          <MassingScene st={st} label={description} animate={!reducedMotion} />
        </Suspense>
      ) : (
        <div>
          <p className="mb-2 text-xs text-muted">{t("studio.massing.fallback")}</p>
          <Elevation st={st} label={description} />
        </div>
      )}

      <div className="mt-4 grid gap-3">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" onClick={() => { if (m >= res.exitMonth) setMonth(0); setPlaying((p) => !p); }} aria-pressed={playing}>
            {playing ? t("studio.massing.pause") : t("studio.massing.play")}
          </Button>
          <label className="grid flex-1 gap-1 text-sm">
            <span>{t("studio.massing.month")} <b className="tabular-nums">{m}</b> · {phase}</span>
            <input
              type="range"
              dir="ltr"
              min={0}
              max={res.exitMonth}
              step={1}
              value={m}
              onChange={(e) => { setPlaying(false); setMonth(Number(e.target.value)); }}
              aria-valuetext={description}
              className="min-h-11 w-full accent-[var(--color-primary)]"
            />
          </label>
        </div>
        {/* Announce on manual scrubbing only; playback would flood screen readers. */}
        <p className="text-sm" aria-live={playing ? "off" : "polite"}>{description}</p>
        <dl className="grid grid-cols-2 gap-4 text-sm sm:max-w-md">
          <div className="border-t border-line pt-2"><dt className="text-muted">{t("studio.massing.position")}</dt><dd className="tabular-nums">{money(cumulative[m] ?? 0)}</dd></div>
          <div className="border-t border-line pt-2"><dt className="text-muted">{t("studio.massing.spent")}</dt><dd className="tabular-nums">{money(spent)}</dd></div>
        </dl>
        <p className="text-xs text-muted">{t("studio.massing.assumption", { floors: st.floors, h: st.floorHeight, cov: `${Math.round(COVERAGE * 100)}%` })}</p>
      </div>
    </section>
  );
}
