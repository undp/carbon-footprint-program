import { describe, it, expect } from "vitest";
import {
  mapOrganizationSummary,
  type OrganizationSummaryWithData,
} from "@/mappers/mapOrganizationSummary.js";

/**
 * Builds an OrganizationSummaryWithData fixture. Only the fields the mapper
 * reads are populated; the cast keeps the fixture terse without reconstructing
 * the whole Prisma view/row types.
 */
function buildSummary(
  overrides: {
    displayStatus?: "ACCREDITED" | "NOT_ACCREDITED" | "BLOCKED";
    lastSubmissionStatus?: string | null;
    sector?: { id: bigint; name: string } | null;
    subsector?: { id: bigint; name: string } | null;
    countryOrganizationSize?: { id: bigint; name: string } | null;
    mainActivity?: { id: bigint; name: string } | null;
    representativeCountryJobPosition?: { id: bigint; name: string } | null;
  } = {}
): OrganizationSummaryWithData {
  return {
    organizationId: 1n,
    name: "Acme",
    displayStatus: overrides.displayStatus ?? "ACCREDITED",
    lastSubmissionStatus:
      overrides.lastSubmissionStatus === undefined
        ? "APPROVED"
        : overrides.lastSubmissionStatus,
    hasUnsubmittedChanges: false,
    organizationData: {
      taxId: "123",
      legalName: "Acme SA",
      tradeName: "Acme",
      address: "Main st",
      employeesCount: 10,
      representativeFullName: "Jane",
      representativeTaxId: "999",
      representativeEmail: "jane@acme.test",
      representativePhone: "555",
      sector: overrides.sector ?? null,
      subsector: overrides.subsector ?? null,
      countryOrganizationSize: overrides.countryOrganizationSize ?? null,
      mainActivity: overrides.mainActivity ?? null,
      representativeCountryJobPosition:
        overrides.representativeCountryJobPosition ?? null,
    },
    // Cast: the mapper only touches the fields set above.
  } as unknown as OrganizationSummaryWithData;
}

describe("mapOrganizationSummary", () => {
  it("maps nested relations when all are null", () => {
    const result = mapOrganizationSummary(buildSummary());

    expect(result.sector).toBeNull();
    expect(result.subsector).toBeNull();
    expect(result.countryOrganizationSize).toBeNull();
    expect(result.mainActivity).toBeNull();
    expect(result.representative.position).toBeNull();
  });

  it("maps nested relations when all are populated", () => {
    const result = mapOrganizationSummary(
      buildSummary({
        sector: { id: 2n, name: "Energy" },
        subsector: { id: 3n, name: "Solar" },
        countryOrganizationSize: { id: 4n, name: "Large" },
        mainActivity: { id: 5n, name: "Manufacturing" },
        representativeCountryJobPosition: { id: 6n, name: "CEO" },
      })
    );

    expect(result.sector).toEqual({ id: "2", name: "Energy" });
    expect(result.subsector).toEqual({ id: "3", name: "Solar" });
    expect(result.countryOrganizationSize).toEqual({ id: "4", name: "Large" });
    expect(result.mainActivity).toEqual({ id: "5", name: "Manufacturing" });
    expect(result.representative.position).toEqual({ id: "6", name: "CEO" });
  });

  it("is editable when not blocked and last submission is not pending", () => {
    const result = mapOrganizationSummary(
      buildSummary({ displayStatus: "ACCREDITED", lastSubmissionStatus: null })
    );
    expect(result.isEditable).toBe(true);
  });

  it("is not editable when blocked", () => {
    const result = mapOrganizationSummary(
      buildSummary({ displayStatus: "BLOCKED" })
    );
    expect(result.isEditable).toBe(false);
  });

  it("is not editable when the last submission is pending", () => {
    const result = mapOrganizationSummary(
      buildSummary({
        displayStatus: "ACCREDITED",
        lastSubmissionStatus: "PENDING",
      })
    );
    expect(result.isEditable).toBe(false);
  });
});
