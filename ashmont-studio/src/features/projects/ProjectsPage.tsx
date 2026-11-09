import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PROJECTS, type ProjectCategory } from "../../content/projects";
import { AsyncState, PageHeader } from "../../design/ui";
import type { Language } from "../../i18n";

const FILTERS: ("all" | ProjectCategory)[] = ["all", "residential", "hospitality", "mixedUse"];

export function ProjectsPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Language;
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
          {list.map((p) => (
            <li key={p.slug}>
              <Link to={`/projects/${p.slug}`} className="flex h-48 flex-col justify-between rounded-md border border-line p-5 hover:bg-surface">
                <span className="eyebrow text-[0.65rem]">{t(`projects.${p.category}`)}</span>
                <span>
                  <span className="block text-2xl font-light">{p.name[lang]}</span>
                  <span className="text-sm text-muted">{t("projects.open")}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
