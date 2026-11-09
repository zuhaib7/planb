import { lazy, Suspense, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { findProject, verifiedFacts } from "../../content/projects";
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

  if (!project) {
    return (
      <div>
        <AsyncState status="empty" emptyText={t("projects.notFound")} />
        <Link to="/projects" className="mt-6 inline-flex min-h-11 items-center text-sm underline">{t("projects.back")}</Link>
      </div>
    );
  }
  const facts = verifiedFacts(project);

  return (
    <article>
      <Link to="/projects" className="mb-6 inline-flex min-h-11 items-center text-sm text-muted hover:text-fg">
        <span aria-hidden="true" className="me-2 inline-block rtl:rotate-180">←</span>
        {t("projects.back")}
      </Link>
      <PageHeader eyebrow={t(`projects.${project.category}`)} title={project.name[lang]} />

      <section aria-labelledby="viewer" className="mb-12">
        <h2 id="viewer" className="eyebrow mb-4">{t("projects.viewer")}</h2>
        {tier === "none" ? (
          <AsyncState status="empty" emptyText={t("projects.noWebgl")} />
        ) : dataSaver ? (
          <AsyncState status="empty" emptyText={t("settings.dataSaverHint")} />
        ) : open3d || tier === "high" ? (
          <Suspense fallback={<Skeleton className="aspect-[4/3] w-full" />}>
            <ModelViewer project={project} quality={tier === "high" ? "high" : "low"} />
          </Suspense>
        ) : (
          <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-4 rounded-md border border-line">
            <Button onClick={() => setOpen3d(true)}>{t("projects.explore3d")}</Button>
          </div>
        )}
      </section>

      <section aria-labelledby="facts" className="mb-12">
        <h2 id="facts" className="eyebrow mb-4">{t("projects.facts")}</h2>
        {facts.length === 0 ? (
          <p className="text-muted">{t("projects.factsPending")}</p>
        ) : (
          <dl className="grid grid-cols-2 gap-4">
            {facts.map((f) => (
              <div key={f.key}><dt className="text-sm text-muted">{f.key}</dt><dd>{f.value[lang]}</dd></div>
            ))}
          </dl>
        )}
      </section>

      <section aria-labelledby="gallery">
        <h2 id="gallery" className="eyebrow mb-4">{t("projects.gallery")}</h2>
        <p className="text-muted">{t("projects.galleryPending")}</p>
      </section>
    </article>
  );
}
