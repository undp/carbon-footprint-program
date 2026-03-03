import { useState, useCallback } from "react";
import { DialogMode } from "../types";

/**
 * Organization state status values
 * - initializing: Initial load, determining if user has organizations
 * - no_organizations: User has no organizations yet
 * - ready: User has organizations, one is selected
 */
export type OrganizationStatus = "initializing" | "no_organizations" | "ready";

/**
 * Explicit organization state interface
 * Replaces tri-state confusion of undefined/null/string
 */
export interface OrganizationState {
  status: OrganizationStatus;
  organizationId: string | null;
}

/**
 * Manages UI state for the MyOrganization screen including organization selection,
 * dialog visibility, and dialog mode.
 *
 * @returns {Object} State management object
 * @returns {OrganizationState} organizationState - Current organization state object
 * @returns {string | null} activeOrganizationId - The currently selected organization ID (for backward compatibility)
 * @returns {OrganizationStatus} organizationStatus - Current organization status
 * @returns {DialogMode} formDialogMode - Current mode of the form dialog (create, edit, or accreditation)
 * @returns {boolean} formDialogOpen - Whether the form dialog is open
 * @returns {Function} handleOrganizationChange - Callback to change the active organization
 * @returns {Function} setOrganizationStatus - Sets the organization status explicitly
 * @returns {Function} openFormDialog - Opens the form dialog with specified mode
 * @returns {Function} closeFormDialog - Closes the form dialog
 * @returns {Function} onEditOrganizationProfile - Opens the form dialog in edit mode
 */
export const useMyOrganizationState = () => {
  const [organizationState, setOrganizationState] = useState<OrganizationState>(
    {
      status: "initializing",
      organizationId: null,
    }
  );

  const [formDialogMode, setFormDialogMode] =
    useState<DialogMode>("accreditation");

  const [formDialogOpen, setFormDialogOpen] = useState(false);

  const handleOrganizationChange = useCallback(
    (organizationId: string | null) => {
      if (organizationId === null) {
        setOrganizationState({
          status: "no_organizations",
          organizationId: null,
        });
      } else {
        setOrganizationState({
          status: "ready",
          organizationId,
        });
      }
    },
    []
  );

  const setOrganizationStatus = useCallback(
    (status: OrganizationStatus, organizationId: string | null = null) => {
      setOrganizationState({ status, organizationId });
    },
    []
  );

  const openFormDialog = useCallback((mode: DialogMode = "accreditation") => {
    setFormDialogMode(mode);
    setFormDialogOpen(true);
  }, []);

  const closeFormDialog = useCallback(() => {
    setFormDialogOpen(false);
  }, []);

  const onEditOrganizationProfile = useCallback(() => {
    openFormDialog("edit");
  }, [openFormDialog]);

  return {
    organizationState,
    // Backward compatibility: expose individual properties
    activeOrganizationId: organizationState.organizationId,
    organizationStatus: organizationState.status,
    formDialogMode,
    formDialogOpen,
    handleOrganizationChange,
    setOrganizationStatus,
    openFormDialog,
    closeFormDialog,
    onEditOrganizationProfile,
  };
};

export type UseMyOrganizationStateReturn = ReturnType<
  typeof useMyOrganizationState
>;
