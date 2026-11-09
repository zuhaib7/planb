import { lazy, Suspense, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { findProject } from "../../content/projects";
import { AsyncState, Button, PageHeader, Skeleton } from "../../design/ui";
import { detectDeviceTier } from "../../lib/device";
import { useSettings } from "../../lib/settings";
import type { Language } from "../../i18n";

// three.js is split into its own chunk and only loaded when someone opens the viewer.
const ModelViewer = lazy(() => import("./ModelViewer"));

export function ProjectDetailPage() {
  const { slug } = useParams();
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Language;
  const project = findProject(slug);
  const { dataSaver } = useSettings();
  const tier = useMemo(() => detectDeviceTier(), []);
  const [open3d, setOpen3d] = useState(false);
  const nf = new Intl.NumberFormat(lang === "ar" ? "ar-SA-u-nu-latn" : "en-US");

  if (!project) {
    return (
      <div>
        <AsyncState status="empty" emptyText={t("projects.notFound")} />
        <Link to="/projects" className="mt-6 inline-flex min-h-11 items-center text-sm underline">{t("projects.back")}</Link>
      </div>
    );
  }

  const area = (v: number | null) => (v ? t("projects.area", { value: nf.format(v) }) : null);
  const facts = [
    { key: "location", value: project.location[lang] },
    { key: "programme", value: project.programme[lang] },
    { key: "services", value: project.services[lang] },
    { key: "builtUp", value: area(project.builtUpArea) },
    { key: "land", value: area(project.landArea) },
  ].filter((f): f is { key: string; value: string } => Boolean(f.value));
  const name = project.name[lang];
  const total = project.images.gallery.length;

  return (
    <article>
      <Link to="/projects" className="mb-6 inline-flex min-h-11 items-center text-sm text-muted hover:text-fg">
        <span aria-hidden="true" className="me-2 inline-block rtl:rotate-180">←</span>
        {t("projects.back")}
      </Link>
      <PageHeader eyebrow={t(`projects.${project.category}`)} title={name}>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted">{project.summary[lang]}</p>
      </PageHeader>

      <img
        src={project.images.hero}
        alt={t("projects.heroAlt", { name })}
        width={1600}
        height={1000}
        fetchPriority="high"
        decoding="async"
        className="mb-12 aspect-[16/10] w-full rounded-md object-cover"
      />

      <section aria-labelledby="facts" className="mb-12">
        <h2 id="facts" className="eyebrow mb-4">{t("projects.facts")}</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
          {facts.map((f) => (
            <div key={f.key} className="border-t border-line pt-3">
              <dt className="text-sm text-muted">{t(`projects.fields.${f.key}`)}</dt>
              <dd className="mt-1">{f.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-muted">{t("projects.source")}</p>
      </section>

      {total > 0 && (
        <section aria-labelledby="gallery" className="mb-12">
          <h2 id="gallery" className="eyebrow mb-4">{t("projects.gallery")}</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {project.images.gallery.map((src, i) => (
              <li key={src} className={i === 0 ? "sm:col-span-2" : undefined}>
                <img
                  src={src}
                  alt={t("projects.imageAlt", { name, n: i + 1, total })}
                  width={1280}
                  height={800}
                  loading="lazy"
                  decoding="async"
                  className="aspect-[16/10] w-full rounded-md object-cover"
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="viewer">
        <h2 id="viewer" className="eyebrow mb-4">{t("projects.viewer")}</h2>
        {tier === "none" ? (
          <AsyncState status="empty" emptyText={t("projects.noWebgl")} />
        ) : dataSaver ? (
          <AsyncState status="empty" emptyText={t("settings.dataSaverHint")} />
        ) : open3d ? (
          <Suspense fallback={<Skeleton className="aspect-[4/3] w-full" />}>
            <ModelViewer project={project} quality={tier === "high" ? "high" : "low"} />
          </Suspense>
        ) : (
          <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-4 rounded-md border border-line">
            <p className="max-w-sm px-6 text-center text-sm text-muted">{t("projects.modelPending")}</p>
            <Button onClick={() => setOpen3d(true)}>{t("projects.explore3d")}</Button>
          </div>
        )}
      </section>
    </article>
  );
}
