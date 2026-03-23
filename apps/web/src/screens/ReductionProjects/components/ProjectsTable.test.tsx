import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test/render";
import { ProjectsTable } from "./ProjectsTable";
import type { ReductionProjectSummary } from "../types";

const mockProjects: ReductionProjectSummary[] = [
  {
    id: "1",
    organizationId: "1",
    organizationBranchId: null,
    name: "Sustitucion parcial de clinker",
    usePcgNationalInventory: false,
    status: "DRAFT",
    createdAt: "2025-10-05T00:00:00.000Z",
    updatedAt: "2025-10-05T00:00:00.000Z",
    firstReportDate: "2025-10-09T00:00:00.000Z",
    reportYears: [2025],
    totalReduction: 50.5,
  },
  {
    id: "2",
    organizationId: "1",
    organizationBranchId: null,
    name: "Cambio a combustibles alternativos",
    usePcgNationalInventory: false,
    status: "APPROVED",
    createdAt: "2024-06-01T00:00:00.000Z",
    updatedAt: "2024-06-15T00:00:00.000Z",
    firstReportDate: "2024-06-15T00:00:00.000Z",
    reportYears: [2024],
    totalReduction: 200,
  },
];

describe("ProjectsTable", () => {
  it("renders table headers", () => {
    render(<ProjectsTable projects={[]} />);

    expect(screen.getByText("Nombre Proyecto")).toBeInTheDocument();
    expect(screen.getByText("Año Reducción")).toBeInTheDocument();
    expect(screen.getByText("Primer Reporte")).toBeInTheDocument();
    expect(screen.getByText("Estado")).toBeInTheDocument();
    expect(screen.getByText("Acciones")).toBeInTheDocument();
  });

  it("renders project rows with correct data", () => {
    render(<ProjectsTable projects={mockProjects} />);

    expect(
      screen.getByText("Sustitucion parcial de clinker")
    ).toBeInTheDocument();

    expect(
      screen.getByText("Cambio a combustibles alternativos")
    ).toBeInTheDocument();
  });

  it("calls onEdit when edit button is clicked", async () => {
    const onEdit = vi.fn();
    const { user } = render(
      <ProjectsTable projects={[mockProjects[0]]} onEdit={onEdit} />
    );

    const editButton = screen.getByRole("button", {
      name: /editar proyecto/i,
    });
    await user.click(editButton);

    expect(onEdit).toHaveBeenCalledWith(mockProjects[0]);
  });

  it("calls onDownload when download button is clicked", async () => {
    const onDownload = vi.fn();
    const { user } = render(
      <ProjectsTable projects={[mockProjects[0]]} onDownload={onDownload} />
    );

    const downloadButton = screen.getByRole("button", {
      name: /descargar/i,
    });
    await user.click(downloadButton);

    expect(onDownload).toHaveBeenCalledWith(mockProjects[0]);
  });

  it("renders without callbacks (optional props)", () => {
    render(<ProjectsTable projects={mockProjects} />);

    // Only DRAFT projects have the "Editar proyecto" tooltip; non-DRAFT are disabled
    expect(
      screen.getAllByRole("button", { name: /editar proyecto/i })
    ).toHaveLength(1);
    expect(
      screen.getAllByRole("button", { name: /descargar/i })
    ).toHaveLength(2);
  });

  it("renders empty table when no projects provided", () => {
    render(<ProjectsTable projects={[]} />);

    expect(screen.getByText("Nombre Proyecto")).toBeInTheDocument();
    expect(
      screen.queryByText("Sustitucion parcial de clinker")
    ).not.toBeInTheDocument();
  });
});
