import { describe, it, expect } from "vitest";
import { useForm } from "react-hook-form";
import { render, screen } from "@/test/render";
import { GeiConsideradosSection } from "./GeiConsideradosSection";
import { AddReductionProjectFormData } from "../types";

function TestWrapper() {
  const { control } = useForm<AddReductionProjectFormData>({
    defaultValues: { selectedGases: [] },
  });
  return <GeiConsideradosSection control={control} />;
}

function TestWrapperWithDefaults() {
  const { control } = useForm<AddReductionProjectFormData>({
    defaultValues: { selectedGases: ["CO2", "CH4"] },
  });
  return <GeiConsideradosSection control={control} />;
}

describe("GeiConsideradosSection", () => {
  it("renders the section title", () => {
    render(<TestWrapper />);

    expect(screen.getByText("GEI Considerados")).toBeInTheDocument();
  });

  it("renders table headers", () => {
    render(<TestWrapper />);

    expect(screen.getByText("GEI")).toBeInTheDocument();
    expect(screen.getByText("Selección")).toBeInTheDocument();
  });

  it("renders all 6 greenhouse gases", () => {
    render(<TestWrapper />);

    expect(screen.getByText("CO2")).toBeInTheDocument();
    expect(screen.getByText("CH4")).toBeInTheDocument();
    expect(screen.getByText("Hidrofluorocarbonados")).toBeInTheDocument();
    expect(screen.getByText("Perfluorocarbonados")).toBeInTheDocument();
    expect(screen.getByText("SF6")).toBeInTheDocument();
    expect(screen.getByText("NF3")).toBeInTheDocument();
  });

  it("renders 6 checkboxes", () => {
    render(<TestWrapper />);

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(6);
  });

  it("starts with no checkboxes checked by default", () => {
    render(<TestWrapper />);

    const checkboxes = screen.getAllByRole("checkbox");
    checkboxes.forEach((checkbox) => {
      expect(checkbox).not.toBeChecked();
    });
  });

  it("renders with pre-selected gases", () => {
    render(<TestWrapperWithDefaults />);

    const checkboxes = screen.getAllByRole("checkbox");
    const checkedCount = checkboxes.filter(
      (cb) => (cb as HTMLInputElement).checked
    ).length;
    expect(checkedCount).toBe(2);
  });

  it("toggles checkbox on click", async () => {
    const { user } = render(<TestWrapper />);

    const checkboxes = screen.getAllByRole("checkbox");
    const firstCheckbox = checkboxes[0];

    expect(firstCheckbox).not.toBeChecked();
    await user.click(firstCheckbox);
    expect(firstCheckbox).toBeChecked();

    await user.click(firstCheckbox);
    expect(firstCheckbox).not.toBeChecked();
  });
});
