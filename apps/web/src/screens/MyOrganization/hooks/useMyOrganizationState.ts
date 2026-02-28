import { useState, useCallback } from "react";

type DialogMode = "create" | "edit" | "accreditation";

/**
 * Manages UI state for the MyOrganization screen
 * Handles organization selection, dialog visibility, and dialog mode
 */
export const useMyOrganizationState = () => {
  // undefined = orgs loading, null = no orgs, string = selected org ID
  const [activeOrganizationId, setActiveOrganizationId] = useState<
    string | null
  >();

  const [formDialogMode, setFormDialogMode] =
    useState<DialogMode>("accreditation");

  const [formDialogOpen, setFormDialogOpen] = useState(false);

  const handleOrganizationChange = useCallback(
    (organizationId: string | null) => {
      setActiveOrganizationId(organizationId);
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
    activeOrganizationId,
    formDialogMode,
    formDialogOpen,
    handleOrganizationChange,
    openFormDialog,
    closeFormDialog,
    onEditOrganizationProfile,
  };
};
