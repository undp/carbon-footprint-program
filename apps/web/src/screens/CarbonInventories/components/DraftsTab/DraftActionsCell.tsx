import { FC, useState, useCallback, useMemo } from "react";
import { Box, CircularProgress } from "@mui/material";
import {
  EditOutlined,
  DeleteOutlined,
  FileCopyOutlined,
  FileDownloadOutlined,
  TaskAltRounded,
  BusinessOutlined,
} from "@mui/icons-material";
import {
  GetAllCarbonInventoriesResponse,
  SystemParameterKeyEnum,
  MeasurementRecognitionBehaviorEnum,
} from "@repo/types";
import { isCarbonInventoryDeletable } from "@repo/utils";
import { DeleteConfirmationDialog } from "../Dialogs/DeleteConfirmationDialog";
import { SelfDeclareCarbonInventoryDialog } from "../Dialogs/SelfDeclareCarbonInventoryDialog";
import { AssociateOrganizationDialog } from "../Dialogs/AssociateOrganizationDialog";
import { SelfDeclareValidationDialog } from "../Dialogs/SelfDeclareValidationDialog";
import { enqueueSnackbar } from "notistack";
import {
  useDeleteCarbonInventory,
  useDuplicateCarbonInventory,
  useSelfDeclareCarbonInventory,
  useSystemParameters,
} from "@/api/query";
import { useMyOrganizations } from "@/api/query/organizations/useMyOrganizations";
import { Routes } from "@/interfaces";
import { useNavigate } from "@tanstack/react-router";
import { AppActionButton, primaryActionButtonSx } from "@/components";
import {
  useCarbonInventoriesStore,
  CarbonInventoriesTab,
} from "../../hooks/useCarbonInventoriesStore";
import { useDownloadCarbonInventory } from "@/hooks";
import {
  getSelfDeclareValidationReason,
  type SelfDeclareValidationReason,
} from "../../utils/selfDeclareValidation";
import { VOCAB } from "@/config/vocab";
import { onboardingTargetProps } from "@/utils/onboardingHighlight";

interface Props {
  carbonInventory: GetAllCarbonInventoriesResponse[number];
  inventories: GetAllCarbonInventoriesResponse;
  /** Tags this row's Autodeclarar action for the home onboarding highlight. */
  isSelfDeclareOnboardingTarget?: boolean;
  /** Tags this row's "Asociar organización" action for the home onboarding highlight. */
  isAssociateOnboardingTarget?: boolean;
}

export const DraftActionsCell: FC<Props> = ({
  carbonInventory,
  inventories,
  isSelfDeclareOnboardingTarget = false,
  isAssociateOnboardingTarget = false,
}) => {
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selfDeclareDialogOpen, setSelfDeclareDialogOpen] = useState(false);
  const [associateOrgDialogOpen, setAssociateOrgDialogOpen] = useState(false);
  const [selfDeclareValidationReason, setSelfDeclareValidationReason] =
    useState<SelfDeclareValidationReason>(null);

  const canDelete = isCarbonInventoryDeletable(carbonInventory.status);
  const hasOrganization = carbonInventory.organizationId !== null;

  const { data: myOrganizations } = useMyOrganizations();
  const hasNoOrganizationsToAssociate =
    myOrganizations !== undefined && myOrganizations.length === 0;
  const associateDisabled = hasOrganization || hasNoOrganizationsToAssociate;

  const { data: systemParameters } = useSystemParameters([
    SystemParameterKeyEnum.CARBON_INVENTORIES_MEASUREMENT_RECOGNITION_BEHAVIOR,
  ]);

  const recognitionBehavior = useMemo(
    () =>
      systemParameters?.find(
        (param) =>
          param.key ===
          SystemParameterKeyEnum.CARBON_INVENTORIES_MEASUREMENT_RECOGNITION_BEHAVIOR
      )?.value,
    [systemParameters]
  );

  const setActiveTab = useCarbonInventoriesStore((state) => state.setActiveTab);
  const { mutateAsync: selfDeclareClick, isPending: isSelfDeclareSubmitting } =
    useSelfDeclareCarbonInventory();
  const { mutateAsync: deleteInventory } = useDeleteCarbonInventory();
  const { mutateAsync: duplicateInventory, isPending: isDuplicating } =
    useDuplicateCarbonInventory();
  const { download, isDownloading } = useDownloadCarbonInventory();

  const onDownloadClick = useCallback(() => {
    void download(
      carbonInventory.id,
      carbonInventory.name,
      carbonInventory.year
    );
  }, [
    carbonInventory.id,
    carbonInventory.name,
    carbonInventory.year,
    download,
  ]);

  const onEditClick = useCallback(() => {
    void navigate({
      to: Routes.CARBON_INVENTORY_BUSINESS_PROFILING,
      params: { inventoryId: carbonInventory.id },
    });
  }, [carbonInventory.id, navigate]);

  const onDuplicateClick = useCallback(async () => {
    try {
      await duplicateInventory(carbonInventory.id);
      enqueueSnackbar("Huella duplicada", { variant: "success" });
    } catch {
      enqueueSnackbar("No se pudo duplicar la huella", { variant: "error" });
    }
  }, [carbonInventory.id, duplicateInventory]);

  const onSelfDeclareClick = useCallback(() => {
    const reason = getSelfDeclareValidationReason(carbonInventory, inventories);
    if (reason) {
      setSelfDeclareValidationReason(reason);
      return;
    }
    setSelfDeclareDialogOpen(true);
  }, [carbonInventory, inventories]);

  const onSelfDeclareConfirm = useCallback(async () => {
    try {
      await selfDeclareClick(carbonInventory.id);
      enqueueSnackbar("Huella autodeclarada", { variant: "success" });
      setActiveTab(CarbonInventoriesTab.HUELLAS);
    } catch {
      enqueueSnackbar("No se pudo autodeclarar la huella", {
        variant: "error",
      });
    } finally {
      setSelfDeclareDialogOpen(false);
    }
  }, [carbonInventory.id, selfDeclareClick, setActiveTab]);

  const onDeleteConfirm = useCallback(async () => {
    try {
      await deleteInventory(carbonInventory.id);
      setDeleteDialogOpen(false);
      enqueueSnackbar("Huella eliminada", { variant: "success" });
    } catch {
      enqueueSnackbar("No se pudo eliminar la huella", { variant: "error" });
    }
  }, [carbonInventory.id, deleteInventory]);

  return (
    <>
      <Box className="justify-left flex items-center gap-2">
        {/* Editar */}
        <AppActionButton tooltip="Editar huella" onClick={onEditClick}>
          <EditOutlined fontSize="small" />
        </AppActionButton>

        {/* Duplicar */}
        <AppActionButton
          tooltip="Duplicar huella"
          onClick={onDuplicateClick}
          disabled={isDuplicating}
        >
          <FileCopyOutlined fontSize="small" />
        </AppActionButton>

        {/* Descargar */}
        <AppActionButton
          tooltip={
            isDownloading
              ? "Descargando..."
              : !carbonInventory.hasActiveLines
                ? "Sin actividades registradas"
                : "Descargar"
          }
          onClick={onDownloadClick}
          disabled={isDownloading || !carbonInventory.hasActiveLines}
          aria-label="Descargar"
        >
          {isDownloading ? (
            <CircularProgress size={16} />
          ) : (
            <FileDownloadOutlined fontSize="small" />
          )}
        </AppActionButton>

        {/* Asociar organización */}
        <AppActionButton
          tooltip={
            hasOrganization
              ? `Esta huella ya tiene una ${VOCAB.organization.noun.singular} asociada`
              : hasNoOrganizationsToAssociate
                ? `No perteneces a ninguna ${VOCAB.organization.noun.singular} a la cual asociar esta huella`
                : `Asociar ${VOCAB.organization.noun.singular}`
          }
          onClick={() => setAssociateOrgDialogOpen(true)}
          disabled={associateDisabled}
          aria-label={`Asociar ${VOCAB.organization.noun.singular}`}
          {...(isAssociateOnboardingTarget
            ? onboardingTargetProps("associate-org")
            : {})}
        >
          <BusinessOutlined fontSize="small" />
        </AppActionButton>

        {/* Autodeclarar */}
        <AppActionButton
          tooltip="Autodeclarar"
          onClick={onSelfDeclareClick}
          sx={primaryActionButtonSx}
          {...(isSelfDeclareOnboardingTarget
            ? onboardingTargetProps("self-declare")
            : {})}
        >
          <TaskAltRounded fontSize="small" />
        </AppActionButton>

        {/* Eliminar */}
        <AppActionButton
          tooltip={canDelete ? "Eliminar" : "No se puede eliminar esta huella"}
          onClick={() => setDeleteDialogOpen(true)}
          disabled={!canDelete}
          aria-label="Eliminar"
        >
          <DeleteOutlined fontSize="small" />
        </AppActionButton>
      </Box>

      <SelfDeclareValidationDialog
        open={selfDeclareValidationReason !== null}
        onClose={() => setSelfDeclareValidationReason(null)}
        reason={selfDeclareValidationReason}
      />

      <SelfDeclareCarbonInventoryDialog
        open={selfDeclareDialogOpen}
        onClose={() => setSelfDeclareDialogOpen(false)}
        onConfirm={onSelfDeclareConfirm}
        isLoading={isSelfDeclareSubmitting}
        isAutomaticRecognition={
          recognitionBehavior === MeasurementRecognitionBehaviorEnum.AUTOMATIC
        }
      />

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={onDeleteConfirm}
      />

      <AssociateOrganizationDialog
        open={associateOrgDialogOpen}
        onClose={() => setAssociateOrgDialogOpen(false)}
        carbonInventory={carbonInventory}
      />
    </>
  );
};
