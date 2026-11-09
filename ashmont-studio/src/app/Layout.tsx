import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useEffect, useRef } from "react";
import { NAV } from "./nav";
import { Icon, Wordmark } from "../design/ui";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-11 items-center gap-3 rounded-sm px-3 text-sm transition-colors ${isActive ? "bg-surface text-fg" : "text-muted hover:text-fg"}`;

export function Layout() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const main = useRef<HTMLElement>(null);
  const firstRender = useRef(true);

  // Move focus to the page on navigation so screen readers announce the new view.
  // Not on first load, so the skip link stays the first Tab stop.
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    main.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      <a href="#main" className="sr-only-focusable fixed start-3 top-3 z-50 rounded-sm bg-primary px-4 py-2 text-on-primary">
        {t("app.skip")}
      </a>

      {/* Desktop and tablet: left rail (right rail in Arabic, via logical properties). */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-e border-line p-5 md:flex">
        <Wordmark className="mb-1" />
        <p className="eyebrow mb-8 text-[0.6rem]">{t("app.descriptor")}</p>
        <nav aria-label={t("nav.main")}>
          <ul className="grid gap-1">
            {NAV.map((n) => (
              <li key={n.to}>
                <NavLink to={n.to} end={n.to === "/"} className={linkClass}>
                  <Icon name={n.icon} />
                  {t(`nav.${n.key}`)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <div className="flex min-h-dvh flex-col">
        <header className="flex items-center justify-between border-b border-line px-4 py-3 md:hidden">
          <Wordmark />
          <NavLink to="/settings" className="flex min-h-11 min-w-11 items-center justify-center text-muted" aria-label={t("nav.settings")}>
            <Icon name="cog" />
          </NavLink>
        </header>
        <main id="main" ref={main} tabIndex={-1} className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-8 outline-none sm:px-8 md:pb-16 md:pt-14">
          <Outlet />
        </main>
      </div>

      {/* Phone: bottom bar with the primary destinations. */}
      <nav aria-label={t("nav.main")} className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg pb-[env(safe-area-inset-bottom)] md:hidden">
        <ul className="grid grid-cols-5">
          {NAV.filter((n) => n.primary).map((n) => (
            <li key={n.to}>
              <NavLink
                to={n.to}
                end={n.to === "/"}
                className={({ isActive }) => `flex min-h-14 flex-col items-center justify-center gap-1 text-[0.7rem] ${isActive ? "text-fg" : "text-muted"}`}
              >
                <Icon name={n.icon} />
                {t(`nav.${n.key}`)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
