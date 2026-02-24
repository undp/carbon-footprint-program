import { describe, it, expect } from "vitest";
import { useForm } from "react-hook-form";
import { render, screen } from "@/test/render";
import { ReductionReportSection } from "./ReductionReportSection";
import { AddReductionProjectFormData, SelectOption } from "../types";

const mockYears: SelectOption[] = [
  { value: "2024", label: "2024" },
  { value: "2023", label: "2023" },
];

function TestWrapper({
  projectName = "",
  calculatedReduction = 0,
}: {
  projectName?: string;
  calculatedReduction?: number;
}) {
  const { control, watch } = useForm<AddReductionProjectFormData>({
    defaultValues: {
      projectName,
      reductionYear: "",
      baselineValue: 0,
      projectValue: 0,
    },
  });
  return (
    <ReductionReportSection
      control={control}
      watch={watch}
      years={mockYears}
      calculatedReduction={calculatedReduction}
    />
  );
}

describe("ReductionReportSection", () => {
  it("renders section title with default placeholder name", () => {
    render(<TestWrapper />);

    expect(
      screen.getByText(/reporte de reducciones\/remociones/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/\[Nombre Proyecto\]/)).toBeInTheDocument();
  });

  it("renders section title with project name when provided", () => {
    render(<TestWrapper projectName="Mi Proyecto" />);

    expect(screen.getByText(/Mi Proyecto/)).toBeInTheDocument();
  });

  it("renders the info banner about absolute values", () => {
    render(<TestWrapper />);

    expect(
      screen.getByText(
        /todos los valores que se ingresan deben ser en valor absoluto/i
      )
    ).toBeInTheDocument();
  });

  it("renders all 4 column headers", () => {
    render(<TestWrapper />);

    expect(screen.getByText("Año de reducción")).toBeInTheDocument();
    expect(screen.getByText("Escenario base")).toBeInTheDocument();
    expect(screen.getByText("Escenario proyecto")).toBeInTheDocument();
    expect(screen.getByText("Reducción")).toBeInTheDocument();
  });

  it("renders reduction field as disabled", () => {
    render(<TestWrapper calculatedReduction={5000} />);

    const reductionInput = screen.getByDisplayValue("5000.00");
    expect(reductionInput).toBeDisabled();
  });

  it("displays calculated reduction with 2 decimal places", () => {
    render(<TestWrapper calculatedReduction={1234.567} />);

    expect(screen.getByDisplayValue("1234.57")).toBeInTheDocument();
  });

  it("displays zero reduction", () => {
    render(<TestWrapper calculatedReduction={0} />);

    expect(screen.getByDisplayValue("0.00")).toBeInTheDocument();
  });

  it("displays negative reduction", () => {
    render(<TestWrapper calculatedReduction={-500} />);

    expect(screen.getByDisplayValue("-500.00")).toBeInTheDocument();
  });
});
