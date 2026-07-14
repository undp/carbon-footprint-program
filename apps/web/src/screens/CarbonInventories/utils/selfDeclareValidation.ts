import {
  GetAllCarbonInventoriesResponse,
  OrganizationDisplayStatusValues,
} from "@repo/types";

type DraftInventory = GetAllCarbonInventoriesResponse[number];

/**
 * The first failing self-declaration check, or `null` when the huella passes
 * every check. Shared contract between the validation logic here and the dialog
 * that renders the reason copy.
 */
export type SelfDeclareValidationReason =
  | "missing-organization"
  | "missing-year"
  | "missing-name"
  | "missing-lines"
  | "missing-completed-lines"
  | "inventory-year-already-declared"
  | "organization-not-accredited"
  | null;

/**
 * The ordered self-declaration checks, as a single source of truth shared by
 * the Autodeclarar action (which surfaces the specific failing reason) and the
 * home onboarding target selection (which spotlights the first draft that would
 * actually succeed). Returns the first failing reason, or null when the huella
 * can be self-declared. Keep the order in sync with the validation dialog copy.
 */
export const getSelfDeclareValidationReason = (
  inventory: DraftInventory,
  inventories: GetAllCarbonInventoriesResponse
): SelfDeclareValidationReason => {
  if (inventory.organizationId === null) return "missing-organization";
  if (!inventory.name) return "missing-name";
  if (inventory.year == null) return "missing-year";
  if (!inventory.hasActiveLines) return "missing-lines";
  if (!inventory.areAllActiveLinesCompleted) return "missing-completed-lines";
  if (
    inventory.organizationDisplayStatus !==
    OrganizationDisplayStatusValues.ACCREDITED
  ) {
    return "organization-not-accredited";
  }
  const yearAlreadyDeclared = inventories.some(
    (other) =>
      other.id !== inventory.id &&
      other.organizationId === inventory.organizationId &&
      other.year === inventory.year &&
      other.isSelfDeclared
  );
  if (yearAlreadyDeclared) return "inventory-year-already-declared";
  return null;
};

/** True when the huella passes every self-declaration check. */
export const isCarbonInventorySelfDeclarable = (
  inventory: DraftInventory,
  inventories: GetAllCarbonInventoriesResponse
): boolean => getSelfDeclareValidationReason(inventory, inventories) === null;
