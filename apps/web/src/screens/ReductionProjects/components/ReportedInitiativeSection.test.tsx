import { describe, it, expect } from "vitest";
import { useForm } from "react-hook-form";
import { render, screen } from "@/test/render";
import { ReportedInitiativeSection } from "./ReportedInitiativeSection";
import { AddReductionProjectFormData } from "../types";

function TestWrapper({
  defaultChecked = false,
}: {
  defaultChecked?: boolean;
}) {
  const { control } = useForm<AddReductionProjectFormData>({
    defaultValues: {
      reportedInOtherInitiative: defaultChecked,
      otherInitiativeDescription: "",
    },
  });
  return <ReportedInitiativeSection control={control} />;
}

describe("ReportedInitiativeSection", () => {
  it("renders the section title", () => {
    render(<TestWrapper />);

    expect(
      screen.getByText("Reportado en otra iniciativa")
    ).toBeInTheDocument();
  });

  it("renders the checkbox with label", () => {
    render(<TestWrapper />);

    expect(screen.getByRole("checkbox")).toBeInTheDocument();
    expect(
      screen.getByText(
        /este proyecto se ha reportado en otra iniciativa/i
      )
    ).toBeInTheDocument();
  });

  it("checkbox starts unchecked by default", () => {
    render(<TestWrapper />);

    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("checkbox starts checked when defaultChecked is true", () => {
    render(<TestWrapper defaultChecked />);

    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("toggles checkbox on click", async () => {
    const { user } = render(<TestWrapper />);

    const checkbox = screen.getByRole("checkbox");
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it("renders the description text field", () => {
    render(<TestWrapper />);

    expect(
      screen.getByLabelText(/descripción de la otra iniciativa/i)
    ).toBeInTheDocument();
  });
});
