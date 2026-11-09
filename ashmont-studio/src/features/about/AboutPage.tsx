import { useTranslation } from "react-i18next";
import { PageHeader } from "../../design/ui";

export function AboutPage() {
  const { t } = useTranslation();
  return (
    <div className="max-w-2xl">
      <PageHeader eyebrow={t("about.eyebrow")} title={t("about.title")} accent={t("about.triad")} />
      <p className="mb-6 text-lg text-muted">{t("about.meaning")}</p>
      <blockquote className="border-s-2 border-accent ps-5 text-2xl font-light">{t("about.philosophy")}</blockquote>
    </div>
  );
}
