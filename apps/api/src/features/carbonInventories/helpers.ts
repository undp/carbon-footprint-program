import {
  SubmissionStatus,
  SubmissionType,
  type Prisma,
  type PrismaClient,
} from "@repo/database";
import { OrganizationRole } from "@repo/database/enums";
import {
  FileType,
  type GetAllCategoriesResponse,
  IconName,
  IconNameSchema,
  type CarbonInventoryRecognitionsType,
  OrganizationDataFieldSchema,
} from "@repo/types";
import type { InventoryOrganizationDataReferences } from "./mappers.js";
import {
  CarbonInventoryNotFoundError,
  CarbonInventoryNotEditableError,
  MethodologyNotFoundError,
} from "./errors.js";
import { DataIntegrityError } from "@/errors/index.js";
import { kgToTon } from "@/utils/number.js";
import {
  CarbonInventoryDisplayStatus,
  CarbonInventoryDisplayStatusEnum,
} from "@repo/types";
import { isCarbonInventoryEditable } from "@repo/utils";
import { RECOGNITION_SUBMISSION_TYPES } from "@repo/types";

const CARBON_INVENTORY_EDIT_ROLES: OrganizationRole[] = [
  OrganizationRole.CONTRIBUTOR,
  OrganizationRole.ADMIN,
];

/**
 * Resolves whether the current request can edit a carbon inventory.
 * Assumes the caller already passed `requireCarbonInventoryAccess`.
 *
 * - Anonymous-via-uuid grants (userId === null) are treated as the creator.(prehandler already made sure that the inventory is accessible)
 * - Standalone inventories (no organizationId) require the user to be the creator.
 * - Org inventories require an active membership with CONTRIBUTOR or ADMIN role.
 *   System admins reading via the bypass have no such membership and get false.
 *
 * The status check is folded in: a non-editable status yields false even when
 * the role check passes.
 *
 * `currentUserMemberships` must be the result of including
 * `organization.memberships` on the inventory query, filtered by the current
 * userId and ACTIVE status. Pure synchronous logic — no DB calls.
 */
export function resolveCarbonInventoryEditAccess(
  inventory: {
    createdById: bigint | null;
    organizationId: bigint | null;
    status: CarbonInventoryDisplayStatus;
  },
  userId: bigint | null,
  currentUserMemberships: { role: OrganizationRole }[]
): boolean {
  if (!isCarbonInventoryEditable(inventory.status)) {
    return false;
  }
  if (userId === null) {
    return true;
  }
  if (!inventory.organizationId) {
    return inventory.createdById === userId;
  }
  const membership = currentUserMemberships[0];
  return !!membership && CARBON_INVENTORY_EDIT_ROLES.includes(membership.role);
}

export const carbonInventoryBaseSelect = {
  id: true,
  name: true,
  organizationData: true,
  methodologyVersionId: true,
  organization: { select: { summary: { select: { name: true } } } },
} satisfies Prisma.CarbonInventorySelect;

export type InventoryBase = Prisma.CarbonInventoryGetPayload<{
  select: typeof carbonInventoryBaseSelect;
}>;

/**
 * Validates that a carbon inventory is in an editable state.
 * Throws CarbonInventoryNotEditableError if not editable.
 */
export function validateCarbonInventoryIsEditable(
  inventory: CarbonInventoryWithSubmissionsMinimal
): void {
  const status = calculateDisplayStatus(inventory);
  if (!isCarbonInventoryEditable(status)) {
    throw new CarbonInventoryNotEditableError(inventory.id.toString(), status);
  }
}

export type CategoryData = Pick<
  GetAllCategoriesResponse[number],
  "id" | "name" | "synonyms" | "position" | "icon" | "color"
> & {
  subtotal: number;
  subcategories: {
    id: string;
    name: string;
    icon: IconName;
    subtotal: number;
  }[];
};

type InventoryWithCategoryData = {
  inventory: InventoryBase;
  categoryData: CategoryData[];
  totalEmissions: number;
};

/**
 * Fetches the carbon inventory and validates it exists and has a methodology.
 */
export async function fetchInventory(
  prismaClient: PrismaClient,
  id: string
): Promise<InventoryBase> {
  const inventory = await prismaClient.carbonInventory.findUnique({
    where: { id: BigInt(id) },
    select: carbonInventoryBaseSelect,
  });

  if (!inventory) {
    throw new CarbonInventoryNotFoundError(id);
  }

  if (!inventory.methodologyVersionId) {
    throw new MethodologyNotFoundError(id);
  }

  return inventory;
}

/**
 * Fetches the methodology categories/subcategories, subtotals from the DB view,
 * and builds category data with totals.
 *
 * By default only subcategories with computed emissions (`subtotal > 0`) are
 * returned — the right behavior for rankings and reduction suggestions, which
 * must not be polluted by subcategories that produce zero emissions.
 *
 * Pass `includeIncompleteSubcategories: true` to also return subcategories
 * that have at least one ACTIVE line but no computed emissions yet (e.g. lines
 * the user started but hasn't completed). The subtotals view INNER-joins ACTIVE
 * lines, so a subcategory has a view row iff it has ≥1 active line; presence in
 * `subtotalMap` is therefore the exact "has active lines" signal. The detailed
 * summary uses this so the review screen lists every active line — complete or
 * not — letting the user see what is still pending.
 */
export async function fetchCategoryData(
  prismaClient: PrismaClient,
  inventory: InventoryBase,
  options: { includeIncompleteSubcategories?: boolean } = {}
): Promise<{ categoryData: CategoryData[]; totalEmissions: number }> {
  const methodology = await prismaClient.methodologyVersion.findUnique({
    where: { id: inventory.methodologyVersionId },
    select: {
      categories: {
        select: {
          id: true,
          name: true,
          synonyms: true,
          position: true,
          icon: true,
          color: true,
          subcategories: {
            select: { id: true, name: true, icon: true },
            orderBy: { name: "asc" },
          },
        },
        orderBy: { position: "asc" },
      },
    },
  });

  if (!methodology) {
    throw new MethodologyNotFoundError(inventory.id.toString());
  }

  const subtotals = await prismaClient.carbonInventorySubtotalsView.findMany({
    where: { carbonInventoryId: inventory.id },
  });

  const subtotalMap = new Map<string, number>();
  for (const row of subtotals) {
    subtotalMap.set(row.subcategoryId.toString(), kgToTon(Number(row.value)));
  }

  const categoryData = methodology.categories.map((category) => {
    const subcategories = category.subcategories
      .map((sub) => ({
        id: sub.id.toString(),
        name: sub.name,
        icon: IconNameSchema.parse(sub.icon),
        subtotal: subtotalMap.get(sub.id.toString()) ?? 0,
      }))
      .filter((sub) =>
        options.includeIncompleteSubcategories
          ? subtotalMap.has(sub.id)
          : sub.subtotal > 0
      );

    const categorySubtotal = subcategories.reduce(
      (sum, sub) => sum + sub.subtotal,
      0
    );

    return {
      id: category.id.toString(),
      name: category.name,
      synonyms: category.synonyms,
      position: category.position,
      icon: IconNameSchema.parse(category.icon),
      color: category.color,
      subtotal: categorySubtotal,
      subcategories,
    };
  });

  const totalEmissions = categoryData.reduce(
    (sum, cat) => sum + cat.subtotal,
    0
  );

  return { categoryData, totalEmissions };
}

/**
 * Convenience: fetches inventory + category data in one call.
 */
export async function fetchInventoryWithCategoryData(
  prismaClient: PrismaClient,
  id: string
): Promise<InventoryWithCategoryData> {
  const inventory = await fetchInventory(prismaClient, id);
  const { categoryData, totalEmissions } = await fetchCategoryData(
    prismaClient,
    inventory
  );
  return { inventory, categoryData, totalEmissions };
}

/**
 * Creates a submission for a carbon inventory, reusing an existing subject if one exists.
 */
export async function createCarbonInventorySubmission(
  prismaClient: PrismaClient | Prisma.TransactionClient,
  carbonInventoryId: bigint,
  type: SubmissionType,
  createdById: bigint | null
): Promise<bigint> {
  const existingSubject =
    await prismaClient.submissionSubjectCarbonInventory.findUnique({
      where: { carbonInventoryId },
      select: { subjectId: true },
    });

  if (existingSubject) {
    const submission = await prismaClient.submission.create({
      data: {
        subjectId: existingSubject.subjectId,
        type,
        createdById,
        updatedAt: null,
      },
    });
    return submission.id;
  } else {
    const subject = await prismaClient.submissionSubject.create({
      data: {
        createdById,
        submissions: {
          create: {
            type,
            createdById,
            updatedAt: null,
          },
        },
        carbonInventory: {
          create: {
            carbonInventoryId,
          },
        },
      },
      include: { submissions: { select: { id: true }, take: 1 } },
    });
    return subject.submissions[0].id;
  }
}

export const carbonInventoryWithSubmissionsMinimalSelect = {
  id: true,
  isSelfDeclared: true,
  submission: {
    select: {
      subject: {
        select: {
          submissions: {
            select: {
              id: true,
              status: true,
              type: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.CarbonInventorySelect;

export type CarbonInventoryWithSubmissionsMinimal =
  Prisma.CarbonInventoryGetPayload<{
    select: typeof carbonInventoryWithSubmissionsMinimalSelect;
  }>;

/**
 * Determines which recognitions a carbon inventory has earned based on its submissions.
 * A recognition is earned when there is at least one submission of that type
 * with status APPROVED or APPROVED_AUTOMATICALLY.
 */
export const calculateEarnedRecognitions = (
  carbonInventory: CarbonInventoryWithSubmissionsMinimal
): CarbonInventoryRecognitionsType[] => {
  const submissions = carbonInventory.submission?.subject.submissions || [];

  return RECOGNITION_SUBMISSION_TYPES.filter((type) =>
    submissions.some(
      (s) =>
        s.type === type &&
        (s.status === SubmissionStatus.APPROVED ||
          s.status === SubmissionStatus.APPROVED_AUTOMATICALLY)
    )
  );
};

export const calculateDisplayStatus = (
  carbonInventory: CarbonInventoryWithSubmissionsMinimal
): CarbonInventoryDisplayStatus => {
  const submissions = carbonInventory.submission?.subject.submissions || [];

  if (!submissions.length) {
    return carbonInventory.isSelfDeclared
      ? CarbonInventoryDisplayStatusEnum.SELF_DECLARED
      : CarbonInventoryDisplayStatusEnum.DRAFT;
  }

  const verifSubs = submissions.filter(
    (s) => s.type === SubmissionType.CARBON_INVENTORY_VERIFICATION
  );

  const calcSubs = submissions.filter(
    (s) => s.type === SubmissionType.CARBON_INVENTORY_CALCULATION
  );

  if (verifSubs.some((s) => s.status === SubmissionStatus.APPROVED))
    return CarbonInventoryDisplayStatusEnum.VERIFICATION_APPROVED;

  if (verifSubs.some((s) => s.status === SubmissionStatus.PENDING))
    return CarbonInventoryDisplayStatusEnum.SUBMITTED_TO_VERIFICATION;

  if (calcSubs.some((s) => s.status === SubmissionStatus.PENDING))
    return CarbonInventoryDisplayStatusEnum.SUBMITTED_TO_CALCULATION;

  if (verifSubs.some((s) => s.status === SubmissionStatus.REVIEWED))
    return CarbonInventoryDisplayStatusEnum.VERIFICATION_REVIEWED;

  if (calcSubs.some((s) => s.status === SubmissionStatus.REVIEWED))
    return CarbonInventoryDisplayStatusEnum.CALCULATION_REVIEWED;

  if (verifSubs.some((s) => s.status === SubmissionStatus.REJECTED))
    return CarbonInventoryDisplayStatusEnum.VERIFICATION_REJECTED;

  if (calcSubs.some((s) => s.status === SubmissionStatus.REJECTED))
    return CarbonInventoryDisplayStatusEnum.CALCULATION_REJECTED;

  if (
    verifSubs.some(
      (s) =>
        s.status === SubmissionStatus.APPROVED ||
        s.status === SubmissionStatus.APPROVED_AUTOMATICALLY
    )
  )
    return CarbonInventoryDisplayStatusEnum.VERIFICATION_APPROVED;

  if (calcSubs.some((s) => s.status === SubmissionStatus.APPROVED))
    return CarbonInventoryDisplayStatusEnum.CALCULATION_APPROVED;

  if (
    calcSubs.some((s) => s.status === SubmissionStatus.APPROVED_AUTOMATICALLY)
  )
    return CarbonInventoryDisplayStatusEnum.SELF_DECLARED;

  return carbonInventory.isSelfDeclared
    ? CarbonInventoryDisplayStatusEnum.SELF_DECLARED
    : CarbonInventoryDisplayStatusEnum.DRAFT;
};

/**
 * Fetches `{ id, name }` for the catalog entities referenced by the inventory's
 * `organizationData` snapshot. Looks up by id WITHOUT filtering on `status`, so DELETED
 * rows are still returned — the FE selector union helper relies on this to keep showing
 * the persisted selection even after admin soft-delete.
 */
export const resolveInventoryOrganizationDataReferences = async (
  prismaClient: PrismaClient,
  rawOrganizationData: unknown
): Promise<InventoryOrganizationDataReferences> => {
  const parsed = OrganizationDataFieldSchema.safeParse(rawOrganizationData);
  if (!parsed.success) {
    throw new DataIntegrityError(
      `Invalid organizationData JSON structure: ${parsed.error.message}`
    );
  }
  if (!parsed.data) {
    return {
      sector: null,
      subsector: null,
      size: null,
      mainActivity: null,
    };
  }

  const data = parsed.data;
  const [sectorRow, subsectorRow, sizeRow, mainActivityRow] = await Promise.all(
    [
      data.sectorId
        ? prismaClient.countrySector.findUnique({
            where: { id: BigInt(data.sectorId) },
            select: { id: true, name: true },
          })
        : Promise.resolve(null),
      data.subsectorId
        ? prismaClient.countrySubsector.findUnique({
            where: { id: BigInt(data.subsectorId) },
            select: { id: true, name: true },
          })
        : Promise.resolve(null),
      data.sizeId
        ? prismaClient.countryOrganizationSize.findUnique({
            where: { id: BigInt(data.sizeId) },
            select: { id: true, name: true },
          })
        : Promise.resolve(null),
      data.mainActivityId
        ? prismaClient.organizationMainActivity.findUnique({
            where: { id: BigInt(data.mainActivityId) },
            select: { id: true, name: true },
          })
        : Promise.resolve(null),
    ]
  );

  return {
    sector: sectorRow
      ? { id: sectorRow.id.toString(), name: sectorRow.name }
      : null,
    subsector: subsectorRow
      ? { id: subsectorRow.id.toString(), name: subsectorRow.name }
      : null,
    size: sizeRow ? { id: sizeRow.id.toString(), name: sizeRow.name } : null,
    mainActivity: mainActivityRow
      ? { id: mainActivityRow.id.toString(), name: mainActivityRow.name }
      : null,
  };
};

/**
 * Builds the blob-path prefix that scopes line-file blobs to a single inventory.
 * The prefix is set at upload time and is tamper-resistant, so callers can use
 * `startsWith` to validate that a file belongs to the inventory it claims to.
 */
export const buildCarbonInventoryLineBlobPathPrefix = (
  carbonInventoryId: string
): string => `${FileType.CARBON_INVENTORY}/${carbonInventoryId}/LINES/`;
