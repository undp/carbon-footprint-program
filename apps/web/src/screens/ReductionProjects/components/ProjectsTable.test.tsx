import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test/render";
import { ProjectsTable } from "./ProjectsTable";
import { ReductionProject } from "../types";

const mockProjects: ReductionProject[] = [
  {
    id: "1",
    name: "Sustitucion parcial de clinker",
    implementationDate: "05-10-2025",
    firstReportDate: "09-10-2025",
    reductionTCO2e: 12500,
    yearsReported: 1,
  },
  {
    id: "2",
    name: "Cambio a combustibles alternativos",
    implementationDate: "01-06-2024",
    firstReportDate: "15-06-2024",
    reductionTCO2e: 8300,
    yearsReported: 2,
  },
];

describe("ProjectsTable", () => {
  it("renders table headers", () => {
    render(<ProjectsTable projects={[]} />);

    expect(screen.getByText("Nombre Proyecto")).toBeInTheDocument();
    expect(screen.getByText("Implementación")).toBeInTheDocument();
    expect(screen.getByText("Primer Reporte")).toBeInTheDocument();
    expect(screen.getByText("Años reportados")).toBeInTheDocument();
    expect(screen.getByText("Acciones")).toBeInTheDocument();
  });

  it("renders project rows with correct data", () => {
    render(<ProjectsTable projects={mockProjects} />);

    expect(
      screen.getByText("Sustitucion parcial de clinker")
    ).toBeInTheDocument();
    expect(screen.getByText("05-10-2025")).toBeInTheDocument();
    expect(screen.getByText("09-10-2025")).toBeInTheDocument();

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

    expect(
      screen.getAllByRole("button", { name: /editar proyecto/i })
    ).toHaveLength(2);
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
