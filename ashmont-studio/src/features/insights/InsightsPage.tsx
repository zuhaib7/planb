import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AsyncState, PageHeader } from "../../design/ui";
import { CACHE_PREFIX } from "../../lib/settings";
import { z } from "zod";

const Article = z.object({ id: z.string(), title: z.string(), excerpt: z.string(), publishedAt: z.string() });
type Article = z.infer<typeof Article>;
const CACHE_KEY = `${CACHE_PREFIX}insights`;

/** The article feed arrives in v2 (headless CMS / JSON feed). Until then this resolves to the offline cache or empty. */
const FEED_URL = "";

async function loadInsights(): Promise<{ items: Article[]; fromCache: boolean }> {
  const cached = (() => { try { return z.array(Article).parse(JSON.parse(localStorage.getItem(CACHE_KEY) ?? "[]")); } catch { return []; } })();
  if (!FEED_URL) return { items: cached, fromCache: false };
  if (!navigator.onLine) return { items: cached, fromCache: true };
  const res = await fetch(FEED_URL, { credentials: "omit" });
  if (!res.ok) throw new Error(`feed ${res.status}`);
  const items = z.array(Article).parse(await res.json()); // validate data from outside the app
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(items)); } catch { /* ignore */ }
  return { items, fromCache: false };
}

export function InsightsPage() {
  const { t } = useTranslation();
  const q = useQuery({ queryKey: ["insights"], queryFn: loadInsights });
  return (
    <div>
      <PageHeader eyebrow={t("insights.eyebrow")} title={t("insights.title")} />
      {q.isPending ? <AsyncState status="loading" /> :
        q.isError ? <AsyncState status={navigator.onLine ? "error" : "offline"} onRetry={() => void q.refetch()} /> :
        q.data.items.length === 0 ? <AsyncState status="empty" emptyText={t("insights.empty")} /> : (
          <>
            {q.data.fromCache && <p role="status" className="mb-4 text-sm text-muted">{t("insights.offline")}</p>}
            <ul className="grid gap-6">
              {q.data.items.map((a) => (
                <li key={a.id} className="border-t border-line pt-4">
                  <h2 className="text-xl font-light">{a.title}</h2>
                  <p className="mt-1 text-muted">{a.excerpt}</p>
                </li>
              ))}
            </ul>
          </>
        )}
    </div>
  );
}
