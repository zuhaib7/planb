import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageHeader } from "../design/ui";

export function NotFound() {
  const { t } = useTranslation();
  return (
    <div>
      <PageHeader eyebrow="404" title={t("notFound.title")} />
      <Link to="/" className="inline-flex min-h-11 items-center underline">{t("notFound.home")}</Link>
    </div>
  );
}
