/**
 * Shared types for MyOrganization screen
 * Centralizes type definitions to reduce duplication and improve type safety
 */

import { GetOrganizationUsersResponse } from "@repo/types";

// Re-export OrganizationRole from database for convenience
export type OrganizationRole =
  GetOrganizationUsersResponse[number]["organizationRole"];

/**
 * Dialog mode for organization form dialog
 * - create: Creating a new organization
 * - edit: Editing an existing organization
 * - accreditation: Accreditation flow for a new organization
 */
export type DialogMode = "create" | "edit" | "accreditation";

/**
 * Form data for adding a new user to an organization
 */
export interface AddUserFormData {
  email: string;
  role: string;
}

/**
 * Form data for editing a user's role in an organization
 */
export interface EditUserRoleFormData {
  role: string;
}
