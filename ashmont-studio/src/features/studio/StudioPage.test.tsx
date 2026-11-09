import { describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWith } from "../../test/render";
import { StudioPage } from "./StudioPage";
import { DEFAULTS } from "./engine";
import { decodeScenario, encodeScenario } from "./fields";

describe("scenario links", () => {
  it("round-trips a scenario", () => {
    expect(decodeScenario(encodeScenario(DEFAULTS.mixedUse))).toEqual(DEFAULTS.mixedUse);
  });
  it("rejects tampered or out-of-range scenarios", () => {
    expect(decodeScenario("not base64 !!")).toBeNull();
    expect(decodeScenario(btoa(JSON.stringify({ ...DEFAULTS.residential, ltc: 5 })))).toBeNull();
    expect(decodeScenario(btoa(JSON.stringify({ ...DEFAULTS.residential, programme: "casino" })))).toBeNull();
    expect(decodeScenario(btoa("x".repeat(5000)))).toBeNull();
  });
});

describe("StudioPage", () => {
  it("shows results, risk and charts with table views", async () => {
    renderWith(<StudioPage />, { route: "/studio" });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Test the numbers");
    expect(within(screen.getByTestId("studio-kpis")).getByText("Equity IRR")).toBeInTheDocument();
    expect(screen.getByText("Residual land value")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Risk: 1,000 delivery scenarios" })).toBeInTheDocument();
    for (const name of ["Distribution of equity IRR across scenarios", "Equity cash position", "Programme", "What moves the result"]) {
      expect(screen.getAllByRole("img", { name }).length).toBeGreaterThan(0);
    }
    expect(screen.getAllByText("Show data as a table")).toHaveLength(4);
    expect(screen.getByRole("note")).toHaveTextContent("Not financial, legal or valuation advice");
  });

  it("recomputes when an input changes and rejects out-of-range values", async () => {
    const user = userEvent.setup();
    renderWith(<StudioPage />, { route: "/studio" });
    const rent = screen.getByLabelText("Rent (net revenue for hotels)");
    const kpis = screen.getByTestId("studio-kpis");
    const before = within(kpis).getByText("Profit on cost").nextElementSibling!.textContent;
    await user.clear(rent);
    await user.type(rent, "1200");
    expect(within(kpis).getByText("Profit on cost").nextElementSibling!.textContent).not.toBe(before);
    await user.clear(rent);
    await user.type(rent, "999999");
    expect(rent).toHaveAttribute("aria-invalid", "true");
    expect(rent).toHaveAccessibleDescription(/between 0 and 20000/);
  });

  it("switching programme loads that programme's example and the CTA carries type and size", async () => {
    const user = userEvent.setup();
    renderWith(<StudioPage />, { route: "/studio" });
    await user.click(screen.getByRole("button", { name: "Hospitality" }));
    expect(screen.getByRole("button", { name: "Hospitality" })).toHaveAttribute("aria-pressed", "true");
    const link = screen.getByRole("link", { name: "Discuss this scenario with Ashmont" });
    expect(link.getAttribute("href")).toBe(`/consultation?type=hospitality&size=${DEFAULTS.hospitality.landArea * DEFAULTS.hospitality.far}`);
  });

  it("loads a shared scenario from the URL", () => {
    const s = encodeScenario({ ...DEFAULTS.residential, landArea: 12345 });
    renderWith(<StudioPage />, { route: `/studio?s=${encodeURIComponent(s)}` });
    expect(screen.getByLabelText("Land area")).toHaveValue("12345");
  });

  it("renders in Arabic", () => {
    renderWith(<StudioPage />, { route: "/studio", lang: "ar" });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("اختبر الأرقام");
    const kpis = screen.getByTestId("studio-kpis");
    expect(within(kpis).getByText("العائد الداخلي على الملكية")).toBeInTheDocument();
    expect(within(kpis).getAllByText(/٪|%/).length).toBeGreaterThan(0);
  });
});
