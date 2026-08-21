/**
 * Shared types for MyOrganization screen
 * Centralizes type definitions to reduce duplication and improve type safety
 */

import { OrganizationRole } from "@repo/types";

/**
 * Dialog mode for organization form dialog
 * - create: Creating a new organization
 * - edit: Editing an existing (non-accredited) organization
 * - accredited: Editing an accredited organization (requires file upload + "Solicitar revisión")
 */
export enum DialogMode {
  create = "create",
  edit = "edit",
  accredited = "accredited",
}

/**
 * Form state for the organization form.
 * Uses empty strings for unset optional fields (HTML inputs can't hold null).
 * Distinct from CreateOrganizationBody, which is the API request shape.
 */
export interface OrganizationFormValues {
  legalName: string;
  tradeName: string | null;
  taxId: string | null;
  address: string | null;
  sectorId: string | null;
  subsectorId: string | null;
  secondarySubsectorId: string | null;
  /**
   * One entry per level of the territorial hierarchy, outermost first, with an
   * empty string for the levels left unanswered. Only the innermost answered
   * level is sent to the API; the rest is derivable from it.
   */
  territoryIds: string[];
  countryOrganizationSizeId: string | null;
  mainActivityId: string | null;
  employeesCount: number | null;
  representativeFullName: string | null;
  representativeTaxId: string | null;
  representativePositionId: string | null;
  representativePhone: string | null;
  representativeEmail: string | null;
  files: File[];
}

/**
 * Form data for adding a new user to an organization
 */
export interface AddUserFormData {
  email: string;
  role: OrganizationRole;
}

/**
 * Form data for editing a user's role in an organization
 */
export interface EditUserRoleFormData {
  role: OrganizationRole;
}
