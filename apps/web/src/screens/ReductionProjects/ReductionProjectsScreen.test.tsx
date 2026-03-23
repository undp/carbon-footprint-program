import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test/render";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReductionProjectsScreen } from "./ReductionProjectsScreen";

const mockNavigate = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useSearch: () => ({}),
}));

vi.mock("@/components/layout", () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="main-layout">{children}</div>
  ),
}));

vi.mock("@/api/query", () => ({
  useReductionProjects: () => ({ data: [], isLoading: false }),
  useOrganizations: () => ({ data: [] }),
  useCopyReductionProject: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteReductionProject: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const renderWithQuery = (ui: React.ReactElement) =>
  render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );

describe("ReductionProjectsScreen", () => {
  it("renders inside MainLayout", () => {
    renderWithQuery(<ReductionProjectsScreen />);

    expect(screen.getByTestId("main-layout")).toBeInTheDocument();
  });

  it("renders the projects section title", () => {
    renderWithQuery(<ReductionProjectsScreen />);

    expect(
      screen.getByText("Proyectos de reduccion")
    ).toBeInTheDocument();
  });

  it("renders the add project button", () => {
    renderWithQuery(<ReductionProjectsScreen />);

    expect(
      screen.getByText(/ingresar proyecto de reduccion/i)
    ).toBeInTheDocument();
  });

  it("navigates to add project when button is clicked", async () => {
    const { user } = renderWithQuery(<ReductionProjectsScreen />);

    const addButton = screen.getByText(/ingresar proyecto de reduccion/i);
    await user.click(addButton);

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({ to: "/app/reduction-projects/add" })
    );
  });
});
