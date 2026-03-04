import {
  OrganizationNotAssociatedError,
  OrganizationNotAccreditedError,
} from "../errors.js";

/**
 * Validates that the carbon inventory has an associated organization
 * and that the organization is accredited.
 */
export function validateOrganizationIsAccredited(
  carbonInventoryId: string,
  organizationId: bigint | null,
  isAccredited: boolean | undefined | null
): void {
  if (!organizationId) {
    throw new OrganizationNotAssociatedError(carbonInventoryId);
  }

  if (!isAccredited) {
    throw new OrganizationNotAccreditedError(carbonInventoryId);
  }
}

/**
 * TODO: Validate the carbon inventory does not have an APPROVED or REJECTED
 * submission of type VERIFICATION. This is a placeholder for future implementation.
 */
export function validateNoExistingVerificationSubmission(): void {
  // TODO: Implement validation that the carbon inventory does not have
  // an APPROVED or REJECTED submission of type VERIFICATION
}
