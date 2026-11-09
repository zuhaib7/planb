import { useTranslation } from "react-i18next";
import { PageHeader } from "../../design/ui";
import { PRIVACY_POLICY_VERSION } from "../../lib/config";

/** DRAFT: requires legal review under PDPL before release. */
export function PrivacyPage() {
  const { t } = useTranslation();
  return (
    <div className="max-w-2xl">
      <PageHeader eyebrow={t("privacy.version", { version: PRIVACY_POLICY_VERSION })} title={t("privacy.title")} />
      <p className="text-lg leading-relaxed">{t("privacy.body")}</p>
    </div>
  );
}
