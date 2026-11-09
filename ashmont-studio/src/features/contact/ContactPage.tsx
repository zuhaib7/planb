import { useTranslation } from "react-i18next";
import { PageHeader } from "../../design/ui";
import { CONTACT } from "../../lib/config";
import { openExternal } from "../../lib/open";

export function ContactPage() {
  const { t } = useTranslation();
  const rows = [
    { label: t("contact.phone"), value: CONTACT.phoneDisplay, href: CONTACT.phoneTel, ltr: true },
    { label: t("contact.whatsapp"), value: CONTACT.phoneDisplay, href: CONTACT.whatsapp, ltr: true },
    { label: t("contact.email"), value: CONTACT.email, href: `mailto:${CONTACT.email}`, ltr: true },
    { label: t("contact.web"), value: "www.ashmont.com.sa", href: CONTACT.web, ltr: true },
    { label: t("contact.address"), value: t("contact.addressValue"), href: CONTACT.maps, ltr: false, cta: t("contact.map") },
  ];
  return (
    <div>
      <PageHeader eyebrow={t("contact.eyebrow")} title={t("contact.title")} />
      <dl className="grid gap-6 sm:grid-cols-2">
        {rows.map((r) => (
          <div key={r.label} className="border-t border-line pt-4">
            <dt className="eyebrow mb-2">{r.label}</dt>
            <dd>
              <a
                href={r.href}
                onClick={(e) => { e.preventDefault(); void openExternal(r.href); }}
                className="inline-flex min-h-11 items-center text-lg underline-offset-4 hover:underline"
                dir={r.ltr ? "ltr" : undefined}
              >
                {r.value}
              </a>
              {r.cta && <span className="block text-sm text-muted">{r.cta}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
