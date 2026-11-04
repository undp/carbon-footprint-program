import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RecognitionScreenHeader } from "./RecognitionScreenHeader";

vi.mock("@/components", () => ({
  OrganizationSelector: () => <div data-testid="organization-selector" />,
}));

const renderHeader = (selectedYear: string) =>
  render(
    <RecognitionScreenHeader
      organizations={[]}
      isLoadingOrgs={false}
      selectedOrganizationId=""
      onOrganizationChange={vi.fn()}
      availableYears={[2026, 2025]}
      selectedYear={selectedYear}
      onYearChange={vi.fn()}
    />
  );

describe("RecognitionScreenHeader", () => {
  it('shows "Todos" in the year selector when no year is selected', () => {
    renderHeader("");

    expect(screen.getByRole("combobox", { name: "Año" })).toHaveTextContent(
      "Todos"
    );
  });

  it("shows the selected year", () => {
    renderHeader("2025");

    expect(screen.getByRole("combobox", { name: "Año" })).toHaveTextContent(
      "2025"
    );
  });
});
