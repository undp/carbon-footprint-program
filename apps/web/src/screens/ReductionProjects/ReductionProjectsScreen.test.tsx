import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test/render";
import { ReductionProjectsScreen } from "./ReductionProjectsScreen";

const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@/components/layout", () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="main-layout">{children}</div>
  ),
}));

describe("ReductionProjectsScreen", () => {
  it("renders inside MainLayout", () => {
    render(<ReductionProjectsScreen />);

    expect(screen.getByTestId("main-layout")).toBeInTheDocument();
  });

  it("renders the page header with organization name", () => {
    render(<ReductionProjectsScreen />);

    expect(
      screen.getByText(/Reducción Cementera del Valle/i)
    ).toBeInTheDocument();
  });

  it("renders the projects section title", () => {
    render(<ReductionProjectsScreen />);

    expect(
      screen.getByText("Proyectos de reduccion")
    ).toBeInTheDocument();
  });

  it("renders action buttons", () => {
    render(<ReductionProjectsScreen />);

    expect(
      screen.getByText(/postular a sello de reduccion/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/ingresar proyecto de reduccion/i)
    ).toBeInTheDocument();
  });

  it("renders the projects table with mock data", () => {
    render(<ReductionProjectsScreen />);

    expect(
      screen.getByText("Sustitucion parcial de clinker por puzolana natural")
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Cambio a combustibles alternativos en hornos de proceso"
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Optimizacion energetica en molienda y ventilacion"
      )
    ).toBeInTheDocument();
  });

  it("renders the applications section", () => {
    render(<ReductionProjectsScreen />);

    expect(
      screen.getByText("Listado de postulaciones")
    ).toBeInTheDocument();
  });

  it("navigates to add project when button is clicked", async () => {
    const { user } = render(<ReductionProjectsScreen />);

    const addButton = screen.getByText(/ingresar proyecto de reduccion/i);
    await user.click(addButton);

    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/app/reduction-projects/add",
    });
  });
});
