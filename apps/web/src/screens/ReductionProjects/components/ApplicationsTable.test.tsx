import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@/test/render";
import { ApplicationsTable } from "./ApplicationsTable";
import { SealApplication, SealApplicationStatus } from "../types";

const mockApplications: SealApplication[] = [
  {
    id: "1",
    reductionYear: 2023,
    applicationDate: "10/10/2024",
    sealName: "Sello Huella Latam Reduccion",
    status: "APPROVED",
  },
  {
    id: "2",
    reductionYear: 2022,
    applicationDate: "05/05/2023",
    sealName: "Sello Reduccion",
    status: "PENDING",
  },
];

describe("ApplicationsTable", () => {
  it("renders table headers", () => {
    render(<ApplicationsTable applications={[]} />);

    expect(screen.getByText("Año de reducción")).toBeInTheDocument();
    expect(screen.getByText("Fecha")).toBeInTheDocument();
    expect(screen.getByText("Sello")).toBeInTheDocument();
    expect(screen.getByText("Estado")).toBeInTheDocument();
    expect(screen.getByText("Acciones")).toBeInTheDocument();
  });

  it("renders application rows with correct data", () => {
    render(<ApplicationsTable applications={mockApplications} />);

    expect(screen.getByText("2023")).toBeInTheDocument();
    expect(screen.getByText("10/10/2024")).toBeInTheDocument();
    expect(
      screen.getByText("Sello Huella Latam Reduccion")
    ).toBeInTheDocument();
    expect(screen.getByText("APROBADO")).toBeInTheDocument();

    expect(screen.getByText("2022")).toBeInTheDocument();
    expect(screen.getByText("PENDIENTE")).toBeInTheDocument();
  });

  it("renders correct status chips for each status", () => {
    const allStatuses: SealApplicationStatus[] = [
      "APPROVED",
      "PENDING",
      "IN_REVIEW",
      "REJECTED",
    ];

    const applications: SealApplication[] = allStatuses.map(
      (status, index) => ({
        id: String(index),
        reductionYear: 2023,
        applicationDate: "01/01/2024",
        sealName: `Sello ${index}`,
        status,
      })
    );

    render(<ApplicationsTable applications={applications} />);

    expect(screen.getByText("APROBADO")).toBeInTheDocument();
    expect(screen.getByText("PENDIENTE")).toBeInTheDocument();
    expect(screen.getByText("EN REVISIÓN")).toBeInTheDocument();
    expect(screen.getByText("RECHAZADO")).toBeInTheDocument();
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

    expect(screen.getByText("Año de reducción")).toBeInTheDocument();
    // No data rows
    expect(screen.queryByText("2023")).not.toBeInTheDocument();
  });
});
