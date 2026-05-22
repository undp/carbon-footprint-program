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
  OrganizationDisplayStatusValues,
} from "@repo/types";
import { isCarbonInventoryDeletable } from "@repo/utils";
import { DeleteConfirmationDialog } from "../Dialogs/DeleteConfirmationDialog";
import { SelfDeclareCarbonInventoryDialog } from "../Dialogs/SelfDeclareCarbonInventoryDialog";
import { AssociateOrganizationDialog } from "../Dialogs/AssociateOrganizationDialog";
import {
  SelfDeclareValidationDialog,
  type SelfDeclareValidationReason,
} from "../Dialogs/SelfDeclareValidationDialog";
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
import { BaseActionButton, primaryActionButtonSx } from "@/components";
import {
  useCarbonInventoriesStore,
  CarbonInventoriesTab,
} from "../../hooks/useCarbonInventoriesStore";
import { useDownloadCarbonInventory } from "@/hooks";
import { VOCAB } from "@/config/vocab";

interface Props {
  carbonInventory: GetAllCarbonInventoriesResponse[number];
  inventories: GetAllCarbonInventoriesResponse;
}

export const DraftActionsCell: FC<Props> = ({
  carbonInventory,
  inventories,
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

  const isYearAlreadySelfDeclared = useMemo(
    () =>
      inventories.some(
        (inv) =>
          inv.id !== carbonInventory.id &&
          inv.organizationId === carbonInventory.organizationId &&
          inv.year === carbonInventory.year &&
          inv.isSelfDeclared
      ),
    [
      inventories,
      carbonInventory.id,
      carbonInventory.organizationId,
      carbonInventory.year,
    ]
  );

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
    if (carbonInventory.organizationId === null) {
      setSelfDeclareValidationReason("missing-organization");
      return;
    }
    if (!carbonInventory.name) {
      setSelfDeclareValidationReason("missing-name");
      return;
    }
    if (carbonInventory.year == null) {
      setSelfDeclareValidationReason("missing-year");
      return;
    }
    if (!carbonInventory.hasActiveLines) {
      setSelfDeclareValidationReason("missing-lines");
      return;
    }
    if (!carbonInventory.areAllActiveLinesCompleted) {
      setSelfDeclareValidationReason("missing-completed-lines");
      return;
    }
    if (
      carbonInventory.organizationDisplayStatus !==
      OrganizationDisplayStatusValues.ACCREDITED
    ) {
      setSelfDeclareValidationReason("organization-not-accredited");
      return;
    }
    if (isYearAlreadySelfDeclared) {
      setSelfDeclareValidationReason("inventory-year-already-declared");
      return;
    }
    setSelfDeclareDialogOpen(true);
  }, [
    carbonInventory.organizationId,
    carbonInventory.name,
    carbonInventory.year,
    carbonInventory.hasActiveLines,
    carbonInventory.areAllActiveLinesCompleted,
    carbonInventory.organizationDisplayStatus,
    isYearAlreadySelfDeclared,
  ]);

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
        <BaseActionButton
          tooltip="Editar huella"
          onClick={onEditClick}
          aria-label="Editar huella"
        >
          <EditOutlined fontSize="small" />
        </BaseActionButton>

        {/* Duplicar */}
        <BaseActionButton
          tooltip="Duplicar huella"
          onClick={onDuplicateClick}
          disabled={isDuplicating}
          aria-label="Duplicar huella"
        >
          <FileCopyOutlined fontSize="small" />
        </BaseActionButton>

        {/* Descargar */}
        <BaseActionButton
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
        </BaseActionButton>

        {/* Asociar organización */}
        <BaseActionButton
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
        >
          <BusinessOutlined fontSize="small" />
        </BaseActionButton>

        {/* Autodeclarar */}
        <BaseActionButton
          tooltip="Autodeclarar"
          onClick={onSelfDeclareClick}
          sx={primaryActionButtonSx}
          aria-label="Autodeclarar"
        >
          <TaskAltRounded sx={{ fontSize: 16 }} />
        </BaseActionButton>

        {/* Eliminar */}
        <BaseActionButton
          tooltip={canDelete ? "Eliminar" : "No se puede eliminar esta huella"}
          onClick={() => setDeleteDialogOpen(true)}
          disabled={!canDelete}
          aria-label="Eliminar"
        >
          <DeleteOutlined fontSize="small" />
        </BaseActionButton>
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
