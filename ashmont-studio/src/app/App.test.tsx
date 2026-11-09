import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWith } from "../test/render";
import { AppRoutes } from "./App";
import { useSettings } from "../lib/settings";

describe("app shell", () => {
  it.each([["en", "ltr", "Projects"], ["ar", "rtl", "المشاريع"]] as const)("renders navigation in %s (%s)", (lang, dir, label) => {
    renderWith(<AppRoutes />, { lang });
    expect(document.documentElement.dir).toBe(dir);
    const navs = screen.getAllByRole("navigation");
    expect(within(navs[0]).getByRole("link", { name: label })).toBeInTheDocument();
  });

  it("shows only approved studio stats on home", () => {
    renderWith(<AppRoutes />);
    for (const v of ["152,000", "24", "415", "22"]) expect(screen.getByText(v)).toBeInTheDocument();
  });

  it("filters projects", async () => {
    const user = userEvent.setup();
    renderWith(<AppRoutes />, { route: "/projects" });
    await user.click(await screen.findByRole("button", { name: "Hospitality" }));
    const main = screen.getByRole("main");
    expect(within(main).getByText("Portal Hotel")).toBeInTheDocument();
    expect(within(main).queryByText("Maison Novaire")).not.toBeInTheDocument();
  });

  it("shows published facts and falls back without WebGL", async () => {
    renderWith(<AppRoutes />, { route: "/projects/regent-park" });
    expect(await screen.findByText("47,360 m²")).toBeInTheDocument();
    expect(screen.getByText("6,850 m²")).toBeInTheDocument();
    expect(screen.getByText("Full Architectural Design")).toBeInTheDocument();
    expect(screen.getByText("As published on ashmont.com.sa")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Regent Park, main view" })).toBeInTheDocument();
    // jsdom has no WebGL, so the static fallback message must show instead of a blank canvas.
    expect(screen.getByText(/can't display 3D/)).toBeInTheDocument();
  });

  it("shows Arabic project data", async () => {
    renderWith(<AppRoutes />, { route: "/projects/maison-novaire", lang: "ar" });
    expect(await screen.findByRole("heading", { level: 1, name: "ميزون نوفير" })).toBeInTheDocument();
    expect(screen.getByText("300 م²")).toBeInTheDocument();
    expect(screen.queryByText("مساحة الأرض")).not.toBeInTheDocument();
  });

  it("shows not found for unknown projects", async () => {
    renderWith(<AppRoutes />, { route: "/projects/nope" });
    expect(await screen.findByText("We couldn't find that project.")).toBeInTheDocument();
  });

  it("settings toggles persist to the store", async () => {
    const user = userEvent.setup();
    renderWith(<AppRoutes />, { route: "/settings" });
    await user.click(await screen.findByRole("switch", { name: /Data saver/ }));
    expect(useSettings.getState().dataSaver).toBe(true);
    await user.click(screen.getByRole("button", { name: "العربية" }));
    expect(useSettings.getState().language).toBe("ar");
  });

  it("insights shows its empty state", async () => {
    renderWith(<AppRoutes />, { route: "/insights" });
    expect(await screen.findByText("Articles will appear here soon.")).toBeInTheDocument();
  });
});
