import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Project } from "../../content/projects";
import type { Language } from "../../i18n";

/** Card with the project's own render. Width/height reserve space so the grid never jumps. */
export function ProjectCard({ project, eager = false }: { project: Project; eager?: boolean }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language as Language;
  return (
    <Link to={`/projects/${project.slug}`} className="group block overflow-hidden rounded-md border border-line bg-surface">
      <img
        src={project.images.thumb}
        alt=""
        width={640}
        height={400}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        className="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
      />
      <span className="block p-5">
        <span className="eyebrow block text-[0.65rem]">{t(`projects.${project.category}`)}</span>
        <span className="mt-2 block text-xl font-light">{project.name[lang]}</span>
        <span className="text-sm text-muted">{project.location[lang]}</span>
      </span>
    </Link>
  );
}
