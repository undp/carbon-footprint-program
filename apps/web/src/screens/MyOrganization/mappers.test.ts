import { describe, expect, it } from "vitest";
import { TerritoryLevel, type GetOrganizationByIdResponse } from "@repo/types";
import { TERRITORY_LEVEL_COUNT } from "./constants";
import {
  getTerritoryChain,
  mapFormValuesToRequest,
  mapOrganizationToFormValues,
} from "./mappers";
import type { OrganizationFormValues } from "./types";

const REGION = {
  id: "1",
  name: "Cibao Norte",
  level: TerritoryLevel.PLANNING_REGION,
};
const PROVINCE = {
  id: "2",
  name: "Santiago",
  level: TerritoryLevel.PROVINCE,
};
const MUNICIPALITY = {
  id: "3",
  name: "Tamboril",
  level: TerritoryLevel.MUNICIPALITY,
};

const buildOrganization = (
  overrides: Partial<GetOrganizationByIdResponse> = {}
): GetOrganizationByIdResponse => ({
  id: "10",
  name: "Lácteos del Valle S.A.",
  lastSubmissionStatus: null,
  hasUnsubmittedChanges: false,
  taxId: "131000000",
  legalName: "Lácteos del Valle S.A.",
  tradeName: null,
  isEditable: true,
  sector: null,
  subsector: null,
  secondarySubsector: null,
  countryOrganizationSize: null,
  mainActivity: null,
  address: null,
  territory: null,
  territoryAncestors: [],
  employeesCount: null,
  representative: {
    fullName: null,
    taxId: null,
    position: null,
    email: null,
    phone: null,
  },
  status: "NOT_ACCREDITED",
  ...overrides,
});

const buildFormValues = (
  overrides: Partial<OrganizationFormValues> = {}
): Omit<OrganizationFormValues, "files"> => ({
  legalName: "Lácteos del Valle S.A.",
  tradeName: "",
  taxId: "",
  address: "",
  sectorId: "",
  subsectorId: "",
  secondarySubsectorId: "",
  territoryIds: Array.from({ length: TERRITORY_LEVEL_COUNT }, () => ""),
  countryOrganizationSizeId: "",
  mainActivityId: "",
  employeesCount: null,
  representativeFullName: "",
  representativeTaxId: "",
  representativePositionId: "",
  representativePhone: "",
  representativeEmail: "",
  ...overrides,
});

describe("getTerritoryChain", () => {
  it("puts the declared node after its ancestors, outermost first", () => {
    const chain = getTerritoryChain({
      territory: MUNICIPALITY,
      territoryAncestors: [REGION, PROVINCE],
    });

    expect(chain).toEqual([REGION, PROVINCE, MUNICIPALITY]);
  });

  it("is empty when the organization declared no location", () => {
    expect(
      getTerritoryChain({ territory: null, territoryAncestors: [] })
    ).toEqual([]);
  });

  it("is the node alone when it is a root of the hierarchy", () => {
    // A registrant who answered only the region: the API returns no ancestors,
    // and the chain must still start at the level the node carries.
    expect(
      getTerritoryChain({ territory: REGION, territoryAncestors: [] })
    ).toEqual([REGION]);
  });
});

describe("mapOrganizationToFormValues — territorial chain", () => {
  it("spreads the chain over the selectors and pads the unanswered levels", () => {
    const values = mapOrganizationToFormValues(
      buildOrganization({
        territory: MUNICIPALITY,
        territoryAncestors: [REGION, PROVINCE],
      })
    );

    expect(values.territoryIds).toEqual(["1", "2", "3", "", ""]);
    expect(values.territoryIds).toHaveLength(TERRITORY_LEVEL_COUNT);
  });

  it("gives every selector an empty string when there is no location", () => {
    const values = mapOrganizationToFormValues(buildOrganization());

    expect(values.territoryIds).toEqual(["", "", "", "", ""]);
  });

  it("leaves the deeper selectors empty when the chain stops early", () => {
    // The Distrito Nacional is itself the municipal level, so a registrant
    // there answers two levels and the rest stay blank.
    const values = mapOrganizationToFormValues(
      buildOrganization({
        territory: PROVINCE,
        territoryAncestors: [REGION],
      })
    );

    expect(values.territoryIds).toEqual(["1", "2", "", "", ""]);
  });
});

describe("mapFormValuesToRequest — territorial chain", () => {
  it("sends only the innermost level answered", () => {
    // The ancestors are implied by the hierarchy; sending them too would let
    // the stored node and its stored ancestors disagree.
    const body = mapFormValuesToRequest(
      buildFormValues({ territoryIds: ["1", "2", "3", "", ""] })
    );

    expect(body.territoryId).toBe("3");
  });

  it("sends null when no level was answered", () => {
    const body = mapFormValuesToRequest(buildFormValues());

    expect(body.territoryId).toBeNull();
  });

  it("sends the innermost answer even if a level above it is blank", () => {
    // Not reachable through the form, which clears every descendant when an
    // ancestor changes, but the mapper must not send a blank string as an id.
    const body = mapFormValuesToRequest(
      buildFormValues({ territoryIds: ["1", "", "3", "", ""] })
    );

    expect(body.territoryId).toBe("3");
  });
});

describe("mapFormValuesToRequest — secondary economic activity", () => {
  it("sends the secondary activity when one was chosen", () => {
    const body = mapFormValuesToRequest(
      buildFormValues({ subsectorId: "7", secondarySubsectorId: "9" })
    );

    expect(body.subsectorId).toBe("7");
    expect(body.secondarySubsectorId).toBe("9");
  });

  it("sends null rather than an empty string when it was left blank", () => {
    const body = mapFormValuesToRequest(buildFormValues({ subsectorId: "7" }));

    expect(body.secondarySubsectorId).toBeNull();
  });
});
