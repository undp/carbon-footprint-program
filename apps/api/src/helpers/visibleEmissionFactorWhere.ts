import type { Prisma } from "@repo/database";
import {
  EmissionFactorDimensionStatus,
  EmissionFactorDimensionValueStatus,
  EmissionFactorStatus,
} from "@repo/types";

const visibleDimensionValueWhere = {
  status: EmissionFactorDimensionValueStatus.ACTIVE,
  dimension: { is: { status: EmissionFactorDimensionStatus.ACTIVE } },
} satisfies Prisma.EmissionFactorDimensionValueWhereInput;

/**
 * The factors the maintainer shows: ACTIVE, with each dimension value either
 * NULL or ACTIVE under an ACTIVE dimension.
 *
 * Through the maintainer an ACTIVE factor never references deleted structure
 * (deletes cascade, and removing a value in use is refused), so this only
 * guards against data written outside it. It is one definition because the
 * listing, methodology duplication and the year copy must agree on which
 * factors exist: if they drifted, duplicating a version and copying a year
 * would carry different catalogues.
 *
 * Spread it into a `where`; it owns `status` and `AND`.
 */
export const visibleEmissionFactorWhere = {
  status: EmissionFactorStatus.ACTIVE,
  AND: [
    {
      OR: [
        { dimensionValue1Id: null },
        { dimensionValue1: { is: visibleDimensionValueWhere } },
      ],
    },
    {
      OR: [
        { dimensionValue2Id: null },
        { dimensionValue2: { is: visibleDimensionValueWhere } },
      ],
    },
  ],
} satisfies Prisma.EmissionFactorWhereInput;
