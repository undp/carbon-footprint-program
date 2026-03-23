import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test/render";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AddReductionProjectScreen } from "./AddReductionProjectScreen";

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => vi.fn(),
  useSearch: () => ({ orgId: undefined, projectId: undefined }),
  createFileRoute: () => () => ({}),
}));

vi.mock("@/api/query", () => ({
  useCreateReductionProject: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useUpdateReductionProject: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useReductionProject: () => ({ data: undefined }),
  useAddReductionProjectReport: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useSubmitReductionProject: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useOrganizations: () => ({ data: [] }),
  useOrganization: () => ({ data: undefined }),
  useSubcategories: () => ({ data: [] }),
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const renderWithQuery = (ui: React.ReactElement) =>
  render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );

describe("AddReductionProjectScreen", () => {
  it("renders the page title", () => {
    renderWithQuery(<AddReductionProjectScreen />);

    expect(
      screen.getByText("Postulación Sello Reducción")
    ).toBeInTheDocument();
  });

  it("renders the Volver button", () => {
    renderWithQuery(<AddReductionProjectScreen />);

    expect(screen.getByText("Volver")).toBeInTheDocument();
  });

  it("renders the section title with info button", () => {
    renderWithQuery(<AddReductionProjectScreen />);

    expect(
      screen.getByText("Identificación de proyecto de Reducción")
    ).toBeInTheDocument();
  });

  it("renders two Guardar Borrador buttons", () => {
    renderWithQuery(<AddReductionProjectScreen />);

    const draftButtons = screen.getAllByText(/guardar borrador/i);
    expect(draftButtons).toHaveLength(2);
  });

  it("renders the Postular Sello Reducción submit button", () => {
    renderWithQuery(<AddReductionProjectScreen />);

    expect(
      screen.getByText("Postular Sello Reducción")
    ).toBeInTheDocument();
  });

  it("renders all form sections", () => {
    renderWithQuery(<AddReductionProjectScreen />);

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
    renderWithQuery(<AddReductionProjectScreen />);

    expect(screen.getByDisplayValue("0.00")).toBeInTheDocument();
  });
});
