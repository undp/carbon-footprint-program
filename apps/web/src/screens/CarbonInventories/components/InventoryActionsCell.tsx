import { FC, useState, useCallback, PropsWithChildren } from "react";
import { Box, IconButtonProps, IconButton, Tooltip } from "@mui/material";
import {
  EditOutlined,
  FileDownloadOutlined,
  VerifiedOutlined,
  DeleteOutlined,
  FileCopyOutlined,
  SendOutlined,
  VisibilityOutlined,
} from "@mui/icons-material";
import {
  CarbonInventoryDisplayStatus,
  CarbonInventoryDisplayStatusEnum,
  InventoryStatus,
  OrganizationDisplayStatus,
  OrganizationDisplayStatusValues,
} from "@repo/types";
import { isCarbonInventoryEditable } from "@repo/utils";
import { CalculationConfirmationDialog } from "./Dialogs/CalculationConfirmationDialog";
import { VerifyConfirmationDialog } from "./Dialogs/VerifyConfirmationDialog";
import { DeleteConfirmationDialog } from "./Dialogs/DeleteConfirmationDialog";
import { MissingOrganizationDialog } from "./Dialogs/MissingOrganizationDialog";
import { UnaccreditedOrganizationDialog } from "./Dialogs/UnaccreditedOrganizationDialog";
import { BlockedOrganizationDialog } from "./Dialogs/BlockedOrganizationDialog";
import { enqueueSnackbar } from "notistack";
import {
  useUpdateCarbonInventory,
  useRequestCalculation,
  useRequestVerification,
  useDuplicateCarbonInventory,
  usePreUploadSubmissionFiles,
} from "@/api/query";
import { Routes } from "@/interfaces";
import { useNavigate } from "@tanstack/react-router";
import { QueryObserverResult, RefetchOptions } from "@tanstack/react-query";

const BaseIconButton: FC<PropsWithChildren<IconButtonProps>> = ({
  children,
  ...props
}) => (
  <IconButton
    sx={(theme) => ({
      border: `1px solid ${props.disabled ? theme.palette.action.disabled : theme.palette.primary.main}`,
      borderRadius: "4px",
      padding: "4px",
    })}
    color="primary"
    size="small"
    {...props}
  >
    {children}
  </IconButton>
);

interface InventoryActionsCellProps {
  inventoryId: string;
  organizationId: string | null;
  organizationDisplayStatus: OrganizationDisplayStatus | null;
  status: CarbonInventoryDisplayStatus;
  refetchInventories: (
    options?: RefetchOptions
  ) => Promise<QueryObserverResult>;
}

export const InventoryActionsCell: FC<InventoryActionsCellProps> = ({
  inventoryId,
  organizationId,
  organizationDisplayStatus,
  status,
  refetchInventories,
}) => {
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [calculationDialogOpen, setCalculationDialogOpen] = useState(false);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [missingOrgDialogOpen, setMissingOrgDialogOpen] = useState(false);
  const [unaccreditedOrgDialogOpen, setUnaccreditedOrgDialogOpen] =
    useState(false);
  const [blockedOrgDialogOpen, setBlockedOrgDialogOpen] = useState(false);

  const isVerified =
    status === CarbonInventoryDisplayStatusEnum.VERIFICATION_APPROVED;

  // for now, we can use the same method to check if the inventory is editable as the one to check if the inventory can request calculation

  const canEdit = isCarbonInventoryEditable(status);

  const canRequestCalculation = isCarbonInventoryEditable(status);

  const canRequestVerification =
    status === CarbonInventoryDisplayStatusEnum.CALCULATION_APPROVED ||
    status === CarbonInventoryDisplayStatusEnum.VERIFICATION_OBJECTED;

  const canDelete = !(
    status === CarbonInventoryDisplayStatusEnum.SUBMITTED_TO_CALCULATION ||
    status === CarbonInventoryDisplayStatusEnum.SUBMITTED_TO_VERIFICATION ||
    isVerified
  );

  const { mutateAsync: updateInventory } = useUpdateCarbonInventory();
  const { mutateAsync: requestCalculation } = useRequestCalculation();
  const { mutateAsync: requestVerification } = useRequestVerification();
  const { mutateAsync: duplicateInventory, isPending: isDuplicating } =
    useDuplicateCarbonInventory();
  const preUploadFiles = usePreUploadSubmissionFiles();
  const [isVerifySubmitting, setIsVerifySubmitting] = useState(false);

  const onEditClick = useCallback(
    (inventoryId: string) => {
      void navigate({
        to: Routes.CARBON_INVENTORY_BUSINESS_PROFILING,
        params: { inventoryId },
      });
    },
    [navigate]
  );

  const onViewClick = useCallback(
    (inventoryId: string) => {
      void navigate({
        to: Routes.CARBON_INVENTORY_EMISSION_SUMMARY,
        params: { inventoryId },
      });
    },
    [navigate]
  );

  const onDeleteClick = useCallback(() => {
    setDeleteDialogOpen(true);
  }, []);

  const onDeleteConfirm = useCallback(async () => {
    try {
      // TODO: we should create a DELETE endpoint for carbon inventories instead of updating the status to DELETED
      await updateInventory({
        id: inventoryId,
        data: { status: InventoryStatus.DELETED },
      });
      setDeleteDialogOpen(false);
      void refetchInventories();
      enqueueSnackbar("Huella eliminada", { variant: "success" });
    } catch {
      enqueueSnackbar("No se pudo eliminar la huella", {
        variant: "error",
      });
    }
  }, [inventoryId, updateInventory, refetchInventories]);

  const onDeleteCancel = useCallback(() => {
    setDeleteDialogOpen(false);
  }, []);

  const onCalculationClick = useCallback(() => {
    if (organizationId === null) {
      setMissingOrgDialogOpen(true);
      return;
    }
    if (organizationDisplayStatus === OrganizationDisplayStatusValues.BLOCKED) {
      setBlockedOrgDialogOpen(true);
      return;
    }
    if (
      organizationDisplayStatus ===
      OrganizationDisplayStatusValues.NOT_ACCREDITED
    ) {
      setUnaccreditedOrgDialogOpen(true);
      return;
    }
    setCalculationDialogOpen(true);
  }, [organizationId, organizationDisplayStatus]);

  const onCalculationConfirm = useCallback(async () => {
    try {
      await requestCalculation(inventoryId);
      setCalculationDialogOpen(false);
      void refetchInventories();
      enqueueSnackbar("Solicitud de cálculo enviada", { variant: "success" });
    } catch {
      enqueueSnackbar("No se pudo enviar la solicitud de cálculo", {
        variant: "error",
      });
    }
  }, [inventoryId, requestCalculation, refetchInventories]);

  const onCalculationCancel = useCallback(() => {
    setCalculationDialogOpen(false);
  }, []);

  const onVerifyClick = useCallback(() => {
    if (organizationId === null) {
      setMissingOrgDialogOpen(true);
      return;
    }
    if (organizationDisplayStatus === OrganizationDisplayStatusValues.BLOCKED) {
      setBlockedOrgDialogOpen(true);
      return;
    }
    if (
      organizationDisplayStatus ===
      OrganizationDisplayStatusValues.NOT_ACCREDITED
    ) {
      setUnaccreditedOrgDialogOpen(true);
      return;
    }
    setVerifyDialogOpen(true);
  }, [organizationId, organizationDisplayStatus]);

  const onVerifyConfirm = useCallback(
    async (files: File[]) => {
      setIsVerifySubmitting(true);
      try {
        let fileUuids: string[] | undefined;
        if (files.length) {
          try {
            fileUuids = await preUploadFiles(files);
          } catch {
            enqueueSnackbar("No se pudieron subir los archivos adjuntos", {
              variant: "error",
            });
            return;
          }
        }
        await requestVerification({
          carbonInventoryId: inventoryId,
          body: { fileUuids },
        });
        setVerifyDialogOpen(false);
        void refetchInventories();
        enqueueSnackbar("Solicitud de verificación enviada", {
          variant: "success",
        });
      } catch {
        enqueueSnackbar("No se pudo enviar la solicitud de verificación", {
          variant: "error",
        });
      } finally {
        setIsVerifySubmitting(false);
      }
    },
    [inventoryId, requestVerification, preUploadFiles, refetchInventories]
  );

  const onVerifyCancel = useCallback(() => {
    setVerifyDialogOpen(false);
  }, []);

  const onDuplicateClick = useCallback(async () => {
    try {
      await duplicateInventory(inventoryId);
      void refetchInventories();
      enqueueSnackbar("Huella duplicada", { variant: "success" });
    } catch {
      enqueueSnackbar("No se pudo duplicar la huella", {
        variant: "error",
      });
    }
  }, [inventoryId, duplicateInventory, refetchInventories]);

  const onDownloadClick = useCallback((_inventoryId: string) => {
    //TODO: Implement download functionality
  }, []);

  return (
    <>
      <Box className="flex justify-center gap-1">
        {/* Edit / View button */}
        {canEdit ? (
          <Tooltip title="Editar huella">
            <BaseIconButton
              onClick={() => onEditClick(inventoryId)}
              disabled={!canEdit}
              aria-label="Editar huella"
            >
              <EditOutlined fontSize="small" />
            </BaseIconButton>
          </Tooltip>
        ) : (
          <Tooltip title="Revisar huella">
            <span>
              <BaseIconButton
                onClick={() => onViewClick(inventoryId)}
                color="primary"
                size="small"
                aria-label="Revisar huella"
              >
                <VisibilityOutlined fontSize="small" />
              </BaseIconButton>
            </span>
          </Tooltip>
        )}

        {/* Request Calculation button */}
        <Tooltip title="Enviar a cálculo">
          <span>
            <BaseIconButton
              onClick={onCalculationClick}
              disabled={!canRequestCalculation}
              aria-label="Enviar a cálculo"
            >
              <SendOutlined fontSize="small" />
            </BaseIconButton>
          </span>
        </Tooltip>

        {/* Request Verification button */}
        <Tooltip title="Enviar a verificación">
          <span>
            <BaseIconButton
              onClick={onVerifyClick}
              disabled={!canRequestVerification}
              aria-label="Enviar a verificación"
            >
              <VerifiedOutlined fontSize="small" />
            </BaseIconButton>
          </span>
        </Tooltip>

        {/* Download button */}
        <Tooltip title="Descargar">
          <span>
            <BaseIconButton
              disabled
              onClick={() => onDownloadClick(inventoryId)}
              aria-label="Descargar"
            >
              <FileDownloadOutlined fontSize="small" />
            </BaseIconButton>
          </span>
        </Tooltip>

        {/* Duplicate button */}

        <Tooltip title="Duplicar huella">
          <span>
            <BaseIconButton
              onClick={onDuplicateClick}
              color="primary"
              size="small"
              aria-label="Duplicar huella"
              disabled={isDuplicating}
            >
              <FileCopyOutlined fontSize="small" />
            </BaseIconButton>
          </span>
        </Tooltip>

        {/* Delete button */}
        <Tooltip
          title={canDelete ? "Eliminar" : "No se puede eliminar esta huella"}
        >
          <span>
            <BaseIconButton
              onClick={onDeleteClick}
              disabled={!canDelete}
              aria-label="Eliminar"
            >
              <DeleteOutlined fontSize="small" />
            </BaseIconButton>
          </span>
        </Tooltip>
      </Box>

      <CalculationConfirmationDialog
        open={calculationDialogOpen}
        onClose={onCalculationCancel}
        onConfirm={onCalculationConfirm}
      />

      <VerifyConfirmationDialog
        open={verifyDialogOpen}
        onClose={onVerifyCancel}
        onConfirm={onVerifyConfirm}
        isLoading={isVerifySubmitting}
      />

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onClose={onDeleteCancel}
        onConfirm={onDeleteConfirm}
      />

      <MissingOrganizationDialog
        open={missingOrgDialogOpen}
        onClose={() => setMissingOrgDialogOpen(false)}
      />

      <UnaccreditedOrganizationDialog
        open={unaccreditedOrgDialogOpen}
        onClose={() => setUnaccreditedOrgDialogOpen(false)}
      />

      <BlockedOrganizationDialog
        open={blockedOrgDialogOpen}
        onClose={() => setBlockedOrgDialogOpen(false)}
      />
    </>
  );
};
