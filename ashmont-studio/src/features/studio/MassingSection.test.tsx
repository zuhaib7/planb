import { describe, expect, it } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { renderWith } from "../../test/render";
import { MassingSection } from "./MassingSection";
import { DEFAULTS, simulate } from "./engine";
import { geometry } from "./massing";

const inputs = DEFAULTS.residential;
const res = simulate(inputs);
const F = geometry(inputs).floors;
let c = 0;
const cumulative = res.months.map((m) => (c += m.levered));

describe("MassingSection", () => {
  it("falls back to an elevation without WebGL and describes the state in text", () => {
    renderWith(<MassingSection inputs={inputs} res={res} cumulative={cumulative} money={(v) => `SAR ${Math.round(v)}`} />);
    expect(screen.getByText(/Elevation view shown instead/)).toBeInTheDocument();
    const slider = screen.getByRole("slider");
    fireEvent.change(slider, { target: { value: "0" } });
    expect(screen.getByRole("img")).toHaveAccessibleName(new RegExp(`Month 0 of ${res.exitMonth}\\. Land acquired\\. 0 of ${F} floors framed, 0 clad\\.`));
    fireEvent.change(slider, { target: { value: String(res.completionMonth + 1) } });
    expect(screen.getByRole("img")).toHaveAccessibleName(new RegExp(`Leasing up\\. ${F} of ${F} floors framed, ${F} clad\\. \\d+% let\\.`));
    expect(slider).toHaveAttribute("aria-valuetext", expect.stringContaining("Leasing up"));
  });

  it("shows the equity position and spend for the chosen month", () => {
    renderWith(<MassingSection inputs={inputs} res={res} cumulative={cumulative} money={(v) => `SAR ${Math.round(v)}`} />);
    fireEvent.change(screen.getByRole("slider"), { target: { value: "0" } });
    expect(screen.getByText("Spent to date").nextElementSibling).toHaveTextContent(`SAR ${Math.round(res.landCost)}`);
    expect(screen.getByText("Equity position").nextElementSibling).toHaveTextContent(`SAR ${Math.round(cumulative[0])}`);
  });

  it("states that the massing is a volume study with its assumptions", () => {
    renderWith(<MassingSection inputs={inputs} res={res} cumulative={cumulative} money={String} />);
    expect(screen.getByText(new RegExp(`Volume study only, not a design: ${F} floors of 3.3 m on 50% of the plot`))).toBeInTheDocument();
  });
});
