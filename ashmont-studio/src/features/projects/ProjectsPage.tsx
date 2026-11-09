import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PROJECTS, type ProjectCategory } from "../../content/projects";
import { AsyncState, PageHeader } from "../../design/ui";
import { ProjectCard } from "./ProjectCard";

const FILTERS: ("all" | ProjectCategory)[] = ["all", "residential", "hospitality", "mixedUse"];

export function ProjectsPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const raw = params.get("type");
  const active = FILTERS.includes(raw as ProjectCategory) ? (raw as ProjectCategory) : "all";
  const list = active === "all" ? PROJECTS : PROJECTS.filter((p) => p.category === active);

  return (
    <div>
      <PageHeader eyebrow={t("projects.eyebrow")} title={t("projects.title")} />
      <div role="group" aria-label={t("projects.filter")} className="mb-8 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={active === f}
            onClick={() => setParams(f === "all" ? {} : { type: f }, { replace: true })}
            className={`min-h-11 rounded-sm border px-4 text-sm ${active === f ? "border-primary bg-primary text-on-primary" : "border-line text-fg"}`}
          >
            {t(f === "all" ? "projects.all" : `projects.${f}`)}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <AsyncState status="empty" emptyText={t("projects.empty")} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p, i) => (
            <li key={p.slug}>
              <ProjectCard project={p} eager={i < 3} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
