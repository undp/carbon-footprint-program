import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test/render";
import { ApplicationsTable } from "./ApplicationsTable";
import type { ReductionProjectSummary, ReductionProjectStatus } from "../types";

const mockApplications: ReductionProjectSummary[] = [
  {
    id: "1",
    organizationId: "1",
    organizationBranchId: null,
    name: "Proyecto Solar",
    usePcgNationalInventory: false,
    status: "APPROVED",
    createdAt: "2024-10-10T00:00:00.000Z",
    updatedAt: null,
    firstReportDate: "2024-10-10T00:00:00.000Z",
    reportYears: [2023],
    totalReduction: 100,
  },
  {
    id: "2",
    organizationId: "1",
    organizationBranchId: null,
    name: "Proyecto Eólico",
    usePcgNationalInventory: false,
    status: "IN_REVIEW",
    createdAt: "2023-05-05T00:00:00.000Z",
    updatedAt: null,
    firstReportDate: null,
    reportYears: [2022],
    totalReduction: 0,
  },
];

describe("ApplicationsTable", () => {
  it("renders table headers", () => {
    render(<ApplicationsTable applications={[]} />);

    expect(screen.getByText("Nombre Proyecto")).toBeInTheDocument();
    expect(screen.getByText("Año Reducción")).toBeInTheDocument();
    expect(screen.getByText("Fecha Creación")).toBeInTheDocument();
    expect(screen.getByText("Estado")).toBeInTheDocument();
    expect(screen.getByText("Acciones")).toBeInTheDocument();
  });

  it("renders application rows with correct data", () => {
    render(<ApplicationsTable applications={mockApplications} />);

    expect(screen.getByText("2023")).toBeInTheDocument();
    expect(screen.getByText("Proyecto Solar")).toBeInTheDocument();
    expect(screen.getByText("APROBADO")).toBeInTheDocument();

    expect(screen.getByText("2022")).toBeInTheDocument();
    expect(screen.getByText("EN REVISIÓN")).toBeInTheDocument();
  });

  it("renders correct status chips for each status", () => {
    const allStatuses: ReductionProjectStatus[] = [
      "APPROVED",
      "DRAFT",
      "IN_REVIEW",
      "REJECTED",
      "OBJECTED",
    ];

    const applications: ReductionProjectSummary[] = allStatuses.map(
      (status, index) => ({
        id: String(index),
        organizationId: "1",
        organizationBranchId: null,
        name: `Proyecto ${index}`,
        usePcgNationalInventory: false,
        status,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: null,
        firstReportDate: null,
        reportYears: [2023],
        totalReduction: 0,
      })
    );

    render(<ApplicationsTable applications={applications} />);

    expect(screen.getByText("APROBADO")).toBeInTheDocument();
    expect(screen.getByText("BORRADOR")).toBeInTheDocument();
    expect(screen.getByText("EN REVISIÓN")).toBeInTheDocument();
    expect(screen.getByText("RECHAZADO")).toBeInTheDocument();
    expect(screen.getByText("OBJETADO")).toBeInTheDocument();
  });

  it("calls onDownload when download button is clicked", async () => {
    const onDownload = vi.fn();
    const { user } = render(
      <ApplicationsTable
        applications={[mockApplications[0]]}
        onDownload={onDownload}
      />
    );

    const downloadButton = screen.getByRole("button", {
      name: /descargar/i,
    });
    await user.click(downloadButton);

    expect(onDownload).toHaveBeenCalledWith(mockApplications[0]);
  });

  it("renders without onDownload callback (optional prop)", () => {
    render(<ApplicationsTable applications={mockApplications} />);

    const downloadButtons = screen.getAllByRole("button", {
      name: /descargar/i,
    });
    expect(downloadButtons).toHaveLength(2);
  });

  it("renders empty table when no applications provided", () => {
    render(<ApplicationsTable applications={[]} />);

    expect(screen.getByText("Año Reducción")).toBeInTheDocument();
    expect(screen.queryByText("2023")).not.toBeInTheDocument();
  });
});
