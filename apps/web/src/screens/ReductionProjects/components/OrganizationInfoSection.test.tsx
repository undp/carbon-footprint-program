import { describe, it, expect } from "vitest";
import { render, screen } from "@/test/render";
import { OrganizationInfoSection } from "./OrganizationInfoSection";
import { OrganizationInfo } from "../types";

const mockOrganizationInfo: OrganizationInfo = {
  legalName: "CEMENTERA DEL VALLE",
  rut: "76.458.320-1",
  legalRepresentative: "Rodrigo Ignacio Paredes Valdés",
};

describe("OrganizationInfoSection", () => {
  it("renders all organization info labels", () => {
    render(
      <OrganizationInfoSection organizationInfo={mockOrganizationInfo} />
    );

    expect(screen.getByText("Razón social")).toBeInTheDocument();
    expect(screen.getByText("RUT/RUC")).toBeInTheDocument();
    expect(
      screen.getByText("Nombre del representante legal")
    ).toBeInTheDocument();
  });

  it("renders all organization info values", () => {
    render(
      <OrganizationInfoSection organizationInfo={mockOrganizationInfo} />
    );

    expect(screen.getByText("CEMENTERA DEL VALLE")).toBeInTheDocument();
    expect(screen.getByText("76.458.320-1")).toBeInTheDocument();
    expect(
      screen.getByText("Rodrigo Ignacio Paredes Valdés")
    ).toBeInTheDocument();
  });

  it("renders a divider", () => {
    const { container } = render(
      <OrganizationInfoSection organizationInfo={mockOrganizationInfo} />
    );

    expect(container.querySelector("hr")).toBeInTheDocument();
  });
});
