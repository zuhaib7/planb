import { describe, expect, it, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWith } from "../../test/render";
import { ConsultationPage } from "./ConsultationPage";
import * as submit from "./submit";

beforeEach(() => vi.restoreAllMocks());

async function fillToContact(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByLabelText("Project type"), "residential");
  await user.type(screen.getByLabelText("Location"), "Riyadh");
  await user.click(screen.getByRole("button", { name: "Next" }));
  await user.type(await screen.findByLabelText("Approximate size (m²)"), "800");
  await user.selectOptions(screen.getByLabelText("Timeline"), "now");
  await user.click(screen.getByRole("button", { name: "Next" }));
  await user.type(await screen.findByLabelText("Full name"), "Sara Ali");
  await user.type(screen.getByLabelText("Mobile number"), "0501234567");
  await user.type(screen.getByLabelText("Email"), "sara@example.com");
}

describe("ConsultationPage", () => {
  it("shows inline errors, marks fields invalid and focuses the first error", async () => {
    const user = userEvent.setup();
    renderWith(<ConsultationPage />);
    await user.click(screen.getByRole("button", { name: "Next" }));
    const type = screen.getByLabelText("Project type");
    expect(type).toHaveAttribute("aria-invalid", "true");
    expect(type).toHaveAccessibleDescription("Please choose an option.");
    expect(screen.getByLabelText("Location")).toHaveAccessibleDescription("This field is required.");
    await waitFor(() => expect(type).toHaveFocus());
  });

  it("uses correct input modes and autofill hints", async () => {
    const user = userEvent.setup();
    renderWith(<ConsultationPage />);
    await fillToContact(user);
    expect(screen.getByLabelText("Mobile number")).toHaveAttribute("inputmode", "tel");
    expect(screen.getByLabelText("Mobile number")).toHaveAttribute("autocomplete", "tel");
    expect(screen.getByLabelText("Email")).toHaveAttribute("inputmode", "email");
  });

  it("requires consent before sending", async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(submit, "submitConsultation");
    renderWith(<ConsultationPage />);
    await fillToContact(user);
    await user.click(screen.getByRole("button", { name: "Send request" }));
    expect(screen.getByText("Please agree before sending.")).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });

  it("submits normalised data and shows success", async () => {
    const user = userEvent.setup();
    const spy = vi.spyOn(submit, "submitConsultation").mockResolvedValue({ ok: true });
    renderWith(<ConsultationPage />);
    await fillToContact(user);
    await user.click(screen.getByRole("checkbox", { name: /I agree/ }));
    await user.click(screen.getByRole("button", { name: "Send request" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Thank you.");
    const [data, lang] = spy.mock.calls[0];
    expect(data.phone).toBe("+966501234567");
    expect(data.sizeM2).toBe(800);
    expect(lang).toBe("en");
  });

  it("shows an error with retry when sending fails", async () => {
    const user = userEvent.setup();
    vi.spyOn(submit, "submitConsultation").mockResolvedValue({ ok: false, reason: "server" });
    renderWith(<ConsultationPage />);
    await fillToContact(user);
    await user.click(screen.getByRole("checkbox", { name: /I agree/ }));
    await user.click(screen.getByRole("button", { name: "Send request" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("couldn't send");
    expect(screen.getByRole("button", { name: "Try again" })).toBeEnabled();
  });

  it("renders in Arabic", () => {
    renderWith(<ConsultationPage />, { lang: "ar" });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("ابدأ بحوار.");
    expect(document.documentElement.dir).toBe("rtl");
  });
});

describe("prefill from the feasibility studio", () => {
  it("accepts valid type and size and ignores junk", async () => {
    const user = userEvent.setup();
    renderWith(<ConsultationPage />, { route: "/consultation?type=hospitality&size=7200" });
    expect(screen.getByLabelText("Project type")).toHaveValue("hospitality");
    await user.type(screen.getByLabelText("Location"), "Riyadh");
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByLabelText("Approximate size (m²)")).toHaveValue("7200");
  });
  it("ignores invalid prefill", () => {
    renderWith(<ConsultationPage />, { route: "/consultation?type=castle&size=-5" });
    expect(screen.getByLabelText("Project type")).toHaveValue("");
  });
});
