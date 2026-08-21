import {
  OrganizationDisplayStatusValues,
  type GetOrganizationByIdResponse,
} from "@repo/types";
import {
  Prisma,
  SubmissionStatus,
  type OrganizationSummaryView,
  type OrganizationData,
  type CountrySector,
  type CountrySubsector,
  type CountryOrganizationSize,
  type OrganizationMainActivity,
  type CountryJobPosition,
  type Territory,
} from "@repo/database";

/**
 * Loads a territorial node together with the ancestors above it. The hierarchy is
 * exactly five levels deep, so the four nested parents are the whole chain — no
 * recursive query and no closure table needed to render the dependent selectors.
 */
export const territoryWithAncestorsInclude = {
  include: {
    parent: {
      include: {
        parent: { include: { parent: { include: { parent: true } } } },
      },
    },
  },
} satisfies Prisma.OrganizationData$territoryArgs;

type TerritoryWithAncestors = Prisma.TerritoryGetPayload<
  typeof territoryWithAncestorsInclude
>;

export type OrganizationSummaryWithData = OrganizationSummaryView & {
  organizationData: OrganizationData & {
    sector: CountrySector | null;
    subsector: CountrySubsector | null;
    secondarySubsector: CountrySubsector | null;
    territory: TerritoryWithAncestors | null;
    countryOrganizationSize: CountryOrganizationSize | null;
    mainActivity: OrganizationMainActivity | null;
    representativeCountryJobPosition: CountryJobPosition | null;
  };
};

const mapTerritory = (territory: Territory) => ({
  id: territory.id.toString(),
  name: territory.name,
  level: territory.level,
});

/**
 * Flattens the loaded parent chain, outermost first — the order the form's
 * dependent selectors are rendered in. Written out level by level rather than as
 * a loop because each nesting depth is its own Prisma payload type.
 */
const mapTerritoryAncestors = (territory: TerritoryWithAncestors) =>
  [
    territory.parent,
    territory.parent?.parent,
    territory.parent?.parent?.parent,
    territory.parent?.parent?.parent?.parent,
  ]
    .flatMap((ancestor) => (ancestor ? [mapTerritory(ancestor)] : []))
    .reverse();

export const mapOrganizationSummary = (
  org: OrganizationSummaryWithData
): GetOrganizationByIdResponse => {
  const orgData = org.organizationData;

  return {
    id: org.organizationId.toString(),
    name: org.name,
    taxId: orgData.taxId,
    legalName: orgData.legalName,
    tradeName: orgData.tradeName,
    status: org.displayStatus,
    lastSubmissionStatus: org.lastSubmissionStatus,
    hasUnsubmittedChanges: org.hasUnsubmittedChanges,
    isEditable:
      org.displayStatus !== OrganizationDisplayStatusValues.BLOCKED &&
      org.lastSubmissionStatus !== SubmissionStatus.PENDING,
    sector: orgData.sector
      ? { id: orgData.sector.id.toString(), name: orgData.sector.name }
      : null,
    subsector: orgData.subsector
      ? { id: orgData.subsector.id.toString(), name: orgData.subsector.name }
      : null,
    secondarySubsector: orgData.secondarySubsector
      ? {
          id: orgData.secondarySubsector.id.toString(),
          name: orgData.secondarySubsector.name,
        }
      : null,
    countryOrganizationSize: orgData.countryOrganizationSize
      ? {
          id: orgData.countryOrganizationSize.id.toString(),
          name: orgData.countryOrganizationSize.name,
        }
      : null,
    mainActivity: orgData.mainActivity
      ? {
          id: orgData.mainActivity.id.toString(),
          name: orgData.mainActivity.name,
        }
      : null,
    address: orgData.address,
    territory: orgData.territory ? mapTerritory(orgData.territory) : null,
    territoryAncestors: orgData.territory
      ? mapTerritoryAncestors(orgData.territory)
      : [],
    employeesCount: orgData.employeesCount,
    representative: {
      fullName: orgData.representativeFullName,
      taxId: orgData.representativeTaxId,
      position: orgData.representativeCountryJobPosition
        ? {
            id: orgData.representativeCountryJobPosition.id.toString(),
            name: orgData.representativeCountryJobPosition.name,
          }
        : null,
      email: orgData.representativeEmail,
      phone: orgData.representativePhone,
    },
  };
};
