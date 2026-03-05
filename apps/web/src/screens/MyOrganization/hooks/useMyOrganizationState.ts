import { useState, useCallback } from "react";
import { DialogMode } from "../types";

/**
 * Manages UI state for the MyOrganization screen including organization selection,
 * dialog visibility, and dialog mode.
 *
 * Simplified to only manage what it needs: dialog state and selected organization ID.
 * Organization existence is determined directly from the organizations query data.
 *
 * @returns {Object} State management object
 * @returns {string | undefined} selectedOrganizationId - The currently selected organization ID
 * @returns {DialogMode} formDialogMode - Current mode of the form dialog (create, edit, or accreditation)
 * @returns {boolean} formDialogOpen - Whether the form dialog is open
 * @returns {Function} setSelectedOrganizationId - Sets the selected organization ID
 * @returns {Function} openFormDialog - Opens the form dialog with specified mode
 * @returns {Function} closeFormDialog - Closes the form dialog
 * @returns {Function} onEditOrganizationProfile - Opens the form dialog in edit mode
 */
export const useMyOrganizationState = () => {
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<
    string | undefined
  >(undefined);

  const [formDialogMode, setFormDialogMode] = useState<DialogMode>("create");

  const [formDialogOpen, setFormDialogOpen] = useState(false);

  const openFormDialog = useCallback((mode: DialogMode = "create") => {
    setFormDialogMode(mode);
    setFormDialogOpen(true);
  }, []);

  const closeFormDialog = useCallback(() => {
    setFormDialogOpen(false);
  }, []);

  const onEditOrganizationProfile = useCallback(() => {
    openFormDialog(selectedOrganizationId ? "edit" : "create");
  }, [openFormDialog, selectedOrganizationId]);

  return {
    selectedOrganizationId,
    setSelectedOrganizationId,
    formDialogMode,
    formDialogOpen,
    openFormDialog,
    closeFormDialog,
    onEditOrganizationProfile,
  };
};

export type UseMyOrganizationStateReturn = ReturnType<
  typeof useMyOrganizationState
>;
