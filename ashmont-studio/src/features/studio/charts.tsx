/**
 * Small SVG charts for the feasibility studio. No chart library: every chart is
 * one axis, thin marks, recessive grid, a hover tooltip, and a table view.
 * Charts render left-to-right in both languages (time and number axes stay LTR).
 */
import { useId, useState, type ReactNode } from "react";

const W = 640;

function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) return [min];
  const span = max - min;
  const step0 = span / count;
  const mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0) ?? step0;
  const start = Math.ceil(min / step) * step;
  const out: number[] = [];
  for (let v = start; v <= max + 1e-9; v += step) out.push(+v.toFixed(10));
  return out;
}

function Tooltip({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  const left = Math.min(Math.max(x, 70), W - 70);
  return (
    <div
      role="presentation"
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-sm border border-line bg-surface px-2 py-1 text-xs text-fg shadow-sm"
      style={{ left: `${(left / W) * 100}%`, top: `${y}px` }}
    >
      {children}
    </div>
  );
}

function Frame({ title, children, table, tableLabel }: { title: string; children: ReactNode; table: ReactNode; tableLabel: string }) {
  return (
    <figure className="m-0">
      <div dir="ltr" className="relative">{children}</div>
      <figcaption className="sr-only">{title}</figcaption>
      <details className="mt-2 text-sm">
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-muted">{tableLabel}</summary>
        <div className="max-h-64 overflow-auto">{table}</div>
      </details>
    </figure>
  );
}

const th = "border-b border-line px-2 py-1 text-start font-normal text-muted";
const td = "border-b border-line px-2 py-1 tabular-nums";

// ---------------------------------------------------------------------------
// Histogram (single series)
// ---------------------------------------------------------------------------
export function Histogram({ samples, format, title, tableLabel, binLabel, markers }: {
  samples: number[];
  format: (v: number) => string;
  title: string;
  tableLabel: string;
  binLabel: (a: string, b: string) => string;
  markers: { value: number; label: string }[];
}) {
  const [hover, setHover] = useState<number | null>(null);
  const H = 180, pad = { l: 8, r: 8, t: 14, b: 26 };
  if (!samples.length) return null;
  const min = samples[0], max = samples[samples.length - 1];
  const bins = 24;
  const width = (max - min) / bins || 1;
  const counts = new Array(bins).fill(0);
  for (const s of samples) counts[Math.min(bins - 1, Math.floor((s - min) / width))]++;
  const top = Math.max(...counts);
  const x = (v: number) => pad.l + ((v - min) / (max - min || 1)) * (W - pad.l - pad.r);
  const y = (c: number) => H - pad.b - (c / top) * (H - pad.t - pad.b);
  const bw = (W - pad.l - pad.r) / bins;
  const ticks = niceTicks(min, max, 5);

  return (
    <Frame
      title={title}
      tableLabel={tableLabel}
      table={
        <table className="w-full border-collapse"><tbody>
          {counts.map((c, i) => (
            <tr key={i}><td className={td}>{binLabel(format(min + i * width), format(min + (i + 1) * width))}</td><td className={td}>{c}</td></tr>
          ))}
        </tbody></table>
      }
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={title} onMouseLeave={() => setHover(null)}>
        <line x1={pad.l} x2={W - pad.r} y1={H - pad.b} y2={H - pad.b} stroke="var(--viz-grid)" />
        {counts.map((c, i) => {
          const h = H - pad.b - y(c);
          return (
            <g key={i} onMouseEnter={() => setHover(i)}>
              <rect x={pad.l + i * bw} y={pad.t} width={bw} height={H - pad.t - pad.b} fill="transparent" />
              {c > 0 && <rect x={pad.l + i * bw + 1} y={y(c)} width={bw - 2} height={h} rx={2} fill="var(--viz-1)" opacity={hover === null || hover === i ? 1 : 0.55} />}
            </g>
          );
        })}
        {markers.map((m) => (
          <g key={m.label}>
            <line x1={x(m.value)} x2={x(m.value)} y1={pad.t - 4} y2={H - pad.b} stroke="var(--color-fg)" strokeDasharray="3 3" strokeWidth={1} />
            <text x={x(m.value)} y={pad.t - 6} textAnchor="middle" fontSize="11" fill="var(--color-fg-muted)">{m.label}</text>
          </g>
        ))}
        {ticks.map((t) => (
          <text key={t} x={x(t)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--color-fg-muted)">{format(t)}</text>
        ))}
      </svg>
      {hover !== null && (
        <Tooltip x={pad.l + (hover + 0.5) * bw} y={y(counts[hover]) * 0.6}>
          {binLabel(format(min + hover * width), format(min + (hover + 1) * width))}: <b>{counts[hover]}</b>
        </Tooltip>
      )}
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// Line with area (single series), crosshair tooltip, event markers
// ---------------------------------------------------------------------------
export function CashLine({ values, format, title, tableLabel, monthLabel, positionLabel, events }: {
  values: number[];
  format: (v: number) => string;
  title: string;
  tableLabel: string;
  monthLabel: (m: number) => string;
  positionLabel: string;
  events: { m: number; label: string }[];
}) {
  const [hover, setHover] = useState<number | null>(null);
  const gid = useId().replace(/:/g, "");
  const H = 220, pad = { l: 100, r: 10, t: 18, b: 24 }; // room for Arabic money labels
  const n = values.length;
  const lo = Math.min(0, ...values), hi = Math.max(0, ...values);
  const x = (i: number) => pad.l + (i / Math.max(1, n - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + ((hi - v) / (hi - lo || 1)) * (H - pad.t - pad.b);
  const path = values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const area = `${path}L${x(n - 1)},${y(0)}L${x(0)},${y(0)}Z`;
  const yt = niceTicks(lo, hi, 4);
  const xt = niceTicks(0, n - 1, 6).filter((t) => Number.isInteger(t));

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    setHover(Math.max(0, Math.min(n - 1, Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (n - 1)))));
  };

  return (
    <Frame
      title={title}
      tableLabel={tableLabel}
      table={
        <table className="w-full border-collapse">
          <thead><tr><th className={th}>{monthLabel(0).replace(/\d+/, "").trim() || "#"}</th><th className={th}>{positionLabel}</th></tr></thead>
          <tbody>{values.map((v, i) => <tr key={i}><td className={td}>{i}</td><td className={td}>{format(v)}</td></tr>)}</tbody>
        </table>
      }
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={title} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--viz-1)" stopOpacity="0.22" />
            <stop offset="1" stopColor="var(--viz-1)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {yt.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--viz-grid)" strokeWidth={t === 0 ? 1.5 : 1} />
            <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--color-fg-muted)">{format(t)}</text>
          </g>
        ))}
        {xt.map((t) => <text key={t} x={x(t)} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--color-fg-muted)">{t}</text>)}
        <path d={area} fill={`url(#${gid})`} />
        <path d={path} fill="none" stroke="var(--viz-1)" strokeWidth={2} strokeLinejoin="round" />
        {events.map((ev) => (
          <g key={ev.label}>
            <line x1={x(ev.m)} x2={x(ev.m)} y1={pad.t} y2={H - pad.b} stroke="var(--color-fg-muted)" strokeDasharray="3 3" />
            {/* Flip the label to the left of the line near the right edge so it never clips. */}
            <text x={x(ev.m) > W - 90 ? x(ev.m) - 4 : x(ev.m) + 4} y={pad.t + 10} textAnchor={x(ev.m) > W - 90 ? "end" : "start"} fontSize="11" fill="var(--color-fg-muted)">{ev.label}</text>
          </g>
        ))}
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="var(--color-fg)" strokeWidth={1} />
            <circle cx={x(hover)} cy={y(values[hover])} r={4.5} fill="var(--viz-1)" stroke="var(--color-bg)" strokeWidth={2} />
          </g>
        )}
      </svg>
      {hover !== null && (
        <Tooltip x={x(hover)} y={Math.max(24, (y(values[hover]) / H) * 220 - 8)}>
          {monthLabel(hover)} · {positionLabel} <b>{format(values[hover])}</b>
        </Tooltip>
      )}
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// Tornado (diverging around the base): downside = gold, upside = teal
// ---------------------------------------------------------------------------
export function Tornado({ rows, base, format, title, tableLabel, labels }: {
  rows: { key: string; label: string; low: number; high: number; lowLabel: string; highLabel: string }[];
  base: number;
  format: (v: number) => string;
  title: string;
  tableLabel: string;
  labels: { downside: string; upside: string; base: string };
}) {
  const [hover, setHover] = useState<string | null>(null);
  const rowH = 30, pad = { l: 150, r: 64, t: 26, b: 22 };
  const H = pad.t + rows.length * rowH + pad.b;
  const lo = Math.min(base, ...rows.map((r) => r.low)), hi = Math.max(base, ...rows.map((r) => r.high));
  const span = hi - lo || 1;
  const x = (v: number) => pad.l + ((v - lo) / span) * (W - pad.l - pad.r);
  return (
    <Frame
      title={title}
      tableLabel={tableLabel}
      table={
        <table className="w-full border-collapse">
          <thead><tr><th className={th} /><th className={th}>{labels.downside}</th><th className={th}>{labels.upside}</th></tr></thead>
          <tbody>{rows.map((r) => (
            <tr key={r.key}><td className={td}>{r.label}</td><td className={td}>{r.lowLabel}: {format(r.low)}</td><td className={td}>{r.highLabel}: {format(r.high)}</td></tr>
          ))}</tbody>
        </table>
      }
    >
      <div className="mb-1 flex gap-4 text-xs text-muted">
        <span className="inline-flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "var(--viz-2)" }} />{labels.downside}</span>
        <span className="inline-flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "var(--viz-1)" }} />{labels.upside}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={title} onMouseLeave={() => setHover(null)}>
        <line x1={x(base)} x2={x(base)} y1={pad.t - 8} y2={H - pad.b + 4} stroke="var(--color-fg)" strokeWidth={1} />
        <text x={x(base)} y={pad.t - 12} textAnchor="middle" fontSize="11" fill="var(--color-fg-muted)">{labels.base}</text>
        {rows.map((r, i) => {
          const cy = pad.t + i * rowH + rowH / 2;
          const dim = hover !== null && hover !== r.key ? 0.55 : 1;
          return (
            <g key={r.key} onMouseEnter={() => setHover(r.key)} opacity={dim}>
              <rect x={0} y={cy - rowH / 2} width={W} height={rowH} fill="transparent" />
              <text x={pad.l - 8} y={cy + 4} textAnchor="end" fontSize="12" fill="var(--color-fg)">{r.label}</text>
              <rect x={x(r.low)} y={cy - 8} width={Math.max(1, x(base) - x(r.low) - 1)} height={16} rx={2} fill="var(--viz-2)" />
              <rect x={x(base) + 1} y={cy - 8} width={Math.max(1, x(r.high) - x(base) - 1)} height={16} rx={2} fill="var(--viz-1)" />
              {hover === r.key && (
                <>
                  <text x={x(r.low) - 4} y={cy + 4} textAnchor="end" fontSize="11" fill="var(--color-fg)">{format(r.low)}</text>
                  <text x={x(r.high) + 4} y={cy + 4} fontSize="11" fill="var(--color-fg)">{format(r.high)}</text>
                </>
              )}
            </g>
          );
        })}
      </svg>
      {hover !== null && (() => {
        const r = rows.find((q) => q.key === hover)!;
        const i = rows.indexOf(r);
        return (
          <Tooltip x={x(base)} y={30 + pad.t + i * rowH}>
            {r.label}: {r.lowLabel} → <b>{format(r.low)}</b> · {r.highLabel} → <b>{format(r.high)}</b>
          </Tooltip>
        );
      })()}
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// Gantt: two categories (design / construction), direct labels
// ---------------------------------------------------------------------------
export function Gantt({ stages, total, title, tableLabel, labelFor, monthsLabel, legend }: {
  stages: { key: string; start: number; months: number; construction: boolean }[];
  total: number;
  title: string;
  tableLabel: string;
  labelFor: (k: string) => string;
  monthsLabel: (n: number) => string;
  legend: { design: string; construction: string };
}) {
  const rowH = 24, pad = { l: 190, r: 50, t: 8, b: 22 };
  const H = pad.t + stages.length * rowH + pad.b;
  const x = (m: number) => pad.l + (m / Math.max(1, total)) * (W - pad.l - pad.r);
  const xt = niceTicks(0, total, 6).filter((t) => Number.isInteger(t));
  return (
    <Frame
      title={title}
      tableLabel={tableLabel}
      table={
        <table className="w-full border-collapse"><tbody>
          {stages.map((s) => <tr key={s.key}><td className={td}>{labelFor(s.key)}</td><td className={td}>{s.start}–{s.start + s.months - 1}</td><td className={td}>{monthsLabel(s.months)}</td></tr>)}
        </tbody></table>
      }
    >
      <div className="mb-1 flex gap-4 text-xs text-muted">
        <span className="inline-flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "var(--viz-2)" }} />{legend.design}</span>
        <span className="inline-flex items-center gap-1"><i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "var(--viz-1)" }} />{legend.construction}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={title}>
        {xt.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={pad.t} y2={H - pad.b} stroke="var(--viz-grid)" />
            <text x={x(t)} y={H - 6} textAnchor="middle" fontSize="11" fill="var(--color-fg-muted)">{t}</text>
          </g>
        ))}
        {stages.map((s, i) => {
          const cy = pad.t + i * rowH + rowH / 2;
          return (
            <g key={s.key}>
              <text x={pad.l - 8} y={cy + 4} textAnchor="end" fontSize="12" fill="var(--color-fg)">{labelFor(s.key)}</text>
              <rect x={x(s.start - 1)} y={cy - 7} width={Math.max(2, x(s.start - 1 + s.months) - x(s.start - 1) - 2)} height={14} rx={2} fill={s.construction ? "var(--viz-1)" : "var(--viz-2)"} />
              <text x={x(s.start - 1 + s.months) + 4} y={cy + 4} fontSize="11" fill="var(--color-fg-muted)">{monthsLabel(s.months)}</text>
            </g>
          );
        })}
      </svg>
    </Frame>
  );
}
