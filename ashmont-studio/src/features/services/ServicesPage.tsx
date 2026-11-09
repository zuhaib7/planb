import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { PageHeader } from "../../design/ui";

const CORE = ["architecture", "interior", "engineering", "consultation", "supervision"] as const;

export function ServicesPage() {
  const { t } = useTranslation();
  const extra = t("services.extra", { returnObjects: true }) as string[];
  return (
    <div>
      <PageHeader eyebrow={t("services.eyebrow")} title={t("services.title")} />
      <ol className="mb-14 grid gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-2">
        {CORE.map((k, i) => (
          <motion.li
            key={k}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.4, delay: i * 0.05 }}
            className="bg-bg p-6"
          >
            <span className="eyebrow">{String(i + 1).padStart(2, "0")}</span>
            <h2 className="mt-4 text-xl font-light">{t(`services.${k}.title`)}</h2>
            <p className="mt-2 text-muted">{t(`services.${k}.body`)}</p>
          </motion.li>
        ))}
      </ol>
      <h2 className="eyebrow mb-4">{t("services.additional")}</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {extra.map((s) => <li key={s} className="border-t border-line pt-3">{s}</li>)}
      </ul>
    </div>
  );
}
