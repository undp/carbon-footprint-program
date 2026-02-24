import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test/render";
import { AddReductionProjectScreen } from "./AddReductionProjectScreen";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
}));

describe("AddReductionProjectScreen", () => {
  it("renders the page title", () => {
    render(<AddReductionProjectScreen />);

    expect(
      screen.getByText("Postulación Sello Reducción")
    ).toBeInTheDocument();
  });

  it("renders the Volver button", () => {
    render(<AddReductionProjectScreen />);

    expect(screen.getByText("Volver")).toBeInTheDocument();
  });

  it("renders the section title with info button", () => {
    render(<AddReductionProjectScreen />);

    expect(
      screen.getByText("Identificación de proyecto de Reducción")
    ).toBeInTheDocument();
  });

  it("renders two Guardar Borrador buttons", () => {
    render(<AddReductionProjectScreen />);

    const draftButtons = screen.getAllByText(/guardar borrador/i);
    expect(draftButtons).toHaveLength(2);
  });

  it("renders the Postular Sello Reducción submit button", () => {
    render(<AddReductionProjectScreen />);

    expect(
      screen.getByText("Postular Sello Reducción")
    ).toBeInTheDocument();
  });

  it("renders organization info section", () => {
    render(<AddReductionProjectScreen />);

    expect(screen.getByText("CEMENTERA DEL VALLE")).toBeInTheDocument();
    expect(screen.getByText("76.458.320-1")).toBeInTheDocument();
  });

  it("renders all form sections", () => {
    render(<AddReductionProjectScreen />);

    // Project identification fields
    expect(screen.getByText("Nombre del proyecto")).toBeInTheDocument();

    // GEI section
    expect(screen.getByText("GEI Considerados")).toBeInTheDocument();

    // Reported initiative section
    expect(
      screen.getByText("Reportado en otra iniciativa")
    ).toBeInTheDocument();

    // Reduction report section
    expect(
      screen.getByText(/reporte de reducciones\/remociones/i)
    ).toBeInTheDocument();

    // File upload section
    expect(
      screen.getByText("Carga de archivos para la postulación")
    ).toBeInTheDocument();
  });

  it("displays calculated reduction as 0.00 initially", () => {
    render(<AddReductionProjectScreen />);

    expect(screen.getByDisplayValue("0.00")).toBeInTheDocument();
  });
});
