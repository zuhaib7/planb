import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { FEATURED_PROJECTS, STUDIO_STATS } from "../../content/projects";
import { ProjectCard } from "../projects/ProjectCard";
import { useSettings } from "../../lib/settings";
import type { Language } from "../../i18n";

/** Set to the Bunny CDN URLs once the brand film cut and poster are supplied. */
const HERO = { video: "", poster: "" };

function HeroMedia() {
  const { dataSaver, reducedMotion } = useSettings();
  if (HERO.video && !dataSaver && !reducedMotion) {
    return <video className="absolute inset-0 h-full w-full object-cover" src={HERO.video} poster={HERO.poster || undefined} autoPlay muted loop playsInline aria-hidden="true" />;
  }
  if (HERO.poster) return <img className="absolute inset-0 h-full w-full object-cover" src={HERO.poster} alt="" />;
  // Decorative architectural line pattern until real media arrives.
  return (
    <svg aria-hidden="true" className="absolute inset-0 h-full w-full text-line" preserveAspectRatio="xMidYMid slice" viewBox="0 0 400 240">
      {Array.from({ length: 12 }, (_, i) => (
        <path key={i} d={`M${-40 + i * 40} 240 L${80 + i * 40} 0`} stroke="currentColor" strokeWidth="0.6" fill="none" />
      ))}
    </svg>
  );
}

export function HomePage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Language;
  const nf = new Intl.NumberFormat(lang === "ar" ? "ar-SA-u-nu-latn" : "en-US");

  return (
    <div>
      <section className="relative -mx-4 mb-14 overflow-hidden px-4 py-16 sm:-mx-8 sm:px-8 sm:py-24">
        <HeroMedia />
        <div className="relative">
          <p className="eyebrow mb-4">{t("home.eyebrow")}</p>
          <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }} className="max-w-3xl text-4xl font-light leading-tight sm:text-6xl">
            {t("home.headline1")}
            <span className="block text-accent-ink">{t("home.headline2")}</span>
          </motion.h1>
          <p className="mt-6 max-w-xl text-lg text-muted">{t("home.lede")}</p>
          <Link to="/consultation" className="mt-8 inline-flex min-h-11 items-center rounded-sm bg-primary px-6 text-sm text-on-primary">
            {t("home.cta")}
          </Link>
        </div>
      </section>

      <section aria-labelledby="stats" className="mb-14">
        <h2 id="stats" className="eyebrow mb-6">{t("home.stats")}</h2>
        <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {STUDIO_STATS.map((s) => (
            <div key={s.key} className="border-t border-line pt-4">
              <dt className="text-sm text-muted">{t(`stats.${s.key}`)}</dt>
              <dd className="order-first text-3xl font-light">{nf.format(s.value)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="studio-cta" className="mb-14 rounded-md border border-line p-6 sm:p-8">
        <h2 id="studio-cta" className="text-2xl font-light">{t("home.studioTitle")}</h2>
        <p className="mt-2 max-w-xl text-muted">{t("home.studioBody")}</p>
        <Link to="/studio" className="mt-6 inline-flex min-h-11 items-center rounded-sm border border-line px-5 text-sm hover:bg-surface">{t("nav.studio")}</Link>
      </section>

      <section aria-labelledby="featured">
        <h2 id="featured" className="eyebrow mb-6">{t("home.featured")}</h2>
        <ul className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4" aria-label={t("home.featured")}>
          {FEATURED_PROJECTS.map((p) => (
            <li key={p.slug} className="w-72 shrink-0 snap-start">
              <ProjectCard project={p} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
