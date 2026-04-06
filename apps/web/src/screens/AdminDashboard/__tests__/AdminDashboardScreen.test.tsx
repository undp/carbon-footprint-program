import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminDashboardScreen } from "../AdminDashboardScreen";
import type { AdminDashboardKpisResponse } from "@repo/types";

// Mock the hook
const mockUseDashboardKpis = vi.fn();
vi.mock("@/api/query/adminDashboard/useDashboardKpis", () => ({
  useDashboardKpis: (...args: unknown[]) => mockUseDashboardKpis(...args),
}));

const MOCK_DATA: AdminDashboardKpisResponse = {
  organizations: { total: 120, measuringInYear: 45 },
  emissions: { total: 5000, verified: 3200 },
  recognitions: { awarded: 10, inApplication: 5 },
  submissionSummary: { inReview: 8, approved: 15, objected: 3 },
  organizationsBySector: [
    { sectorName: "Energía", count: 30, emissions: 1500 },
    { sectorName: "Transporte", count: 25, emissions: 1200 },
  ],
  emissionsByScope: {
    scope1Percentage: 40,
    scope2Percentage: 35,
    scope3Percentage: 25,
  },
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("AdminDashboardScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading skeletons while data is loading", () => {
    mockUseDashboardKpis.mockReturnValue({
      data: undefined,
      isLoading: true,
    });

    const { container } = render(<AdminDashboardScreen />, {
      wrapper: createWrapper(),
    });

    const skeletons = container.querySelectorAll(".MuiSkeleton-root");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders dashboard content when data is loaded", async () => {
    mockUseDashboardKpis.mockReturnValue({
      data: MOCK_DATA,
      isLoading: false,
    });

    render(<AdminDashboardScreen />, { wrapper: createWrapper() });

    expect(screen.getByText("Dashboard General")).toBeInTheDocument();
    expect(screen.getByText("Empresas inscritas")).toBeInTheDocument();
    expect(screen.getByText("Huella tCO₂e")).toBeInTheDocument();
    expect(screen.getByText("Reconocimientos")).toBeInTheDocument();
    expect(screen.getByText("Empresas por Rubro")).toBeInTheDocument();
    expect(screen.getByText("Distribución por Alcance")).toBeInTheDocument();
    expect(screen.getByText("Resumen de Postulaciones")).toBeInTheDocument();
  });

  it("calls useDashboardKpis with the selected year", async () => {
    mockUseDashboardKpis.mockReturnValue({
      data: MOCK_DATA,
      isLoading: false,
    });

    render(<AdminDashboardScreen />, { wrapper: createWrapper() });

    const currentYear = new Date().getFullYear();
    expect(mockUseDashboardKpis).toHaveBeenCalledWith(currentYear);
  });

  it("updates year when selector changes", async () => {
    mockUseDashboardKpis.mockReturnValue({
      data: MOCK_DATA,
      isLoading: false,
    });

    render(<AdminDashboardScreen />, { wrapper: createWrapper() });

    // Open the select
    const select = screen.getByLabelText("Año");
    fireEvent.mouseDown(select);

    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;

    // Select previous year
    await waitFor(() => {
      const option = screen.getByRole("option", {
        name: String(previousYear),
      });
      fireEvent.click(option);
    });

    expect(mockUseDashboardKpis).toHaveBeenCalledWith(previousYear);
  });
});
