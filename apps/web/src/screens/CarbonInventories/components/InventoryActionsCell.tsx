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
} from "@repo/types";
import { CalculationConfirmationDialog } from "./Dialogs/CalculationConfirmationDialog";
import { VerifyConfirmationDialog } from "./Dialogs/VerifyConfirmationDialog";
import { DeleteConfirmationDialog } from "./Dialogs/DeleteConfirmationDialog";
import { enqueueSnackbar } from "notistack";
import {
  useUpdateCarbonInventory,
  useRequestCalculation,
  useRequestVerification,
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
  status: CarbonInventoryDisplayStatus;
  refetchInventories: (
    options?: RefetchOptions
  ) => Promise<QueryObserverResult>;
}

export const InventoryActionsCell: FC<InventoryActionsCellProps> = ({
  inventoryId,
  status,
  refetchInventories,
}) => {
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [calculationDialogOpen, setCalculationDialogOpen] = useState(false);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);

  const isVerified =
    status === CarbonInventoryDisplayStatusEnum.VERIFICATION_APPROVED;

  const canEdit =
    status === CarbonInventoryDisplayStatusEnum.DRAFT ||
    status === CarbonInventoryDisplayStatusEnum.CALCULATION_OBJECTED;

  const canRequestCalculation =
    status === CarbonInventoryDisplayStatusEnum.DRAFT ||
    status === CarbonInventoryDisplayStatusEnum.CALCULATION_OBJECTED;

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
        //TODO: Replace with view route of summary when available
        to: Routes.CARBON_INVENTORY_EMISSION_CAPTURE,
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
      enqueueSnackbar("Inventario eliminado", { variant: "success" });
    } catch {
      enqueueSnackbar("No se pudo eliminar el inventario", {
        variant: "error",
      });
    }
  }, [inventoryId, updateInventory, refetchInventories]);

  const onDeleteCancel = useCallback(() => {
    setDeleteDialogOpen(false);
  }, []);

  const onCalculationClick = useCallback(() => {
    setCalculationDialogOpen(true);
  }, []);

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
    setVerifyDialogOpen(true);
  }, []);

  const onVerifyConfirm = useCallback(async () => {
    try {
      await requestVerification(inventoryId);
      setVerifyDialogOpen(false);
      void refetchInventories();
      enqueueSnackbar("Solicitud de verificación enviada", {
        variant: "success",
      });
    } catch {
      enqueueSnackbar("No se pudo enviar la solicitud de verificación", {
        variant: "error",
      });
    }
  }, [inventoryId, requestVerification, refetchInventories]);

  const onVerifyCancel = useCallback(() => {
    setVerifyDialogOpen(false);
  }, []);

  // const onRewardsClick = useCallback((_inventoryId: string) => {
  //   //TODO: Implement rewards functionality
  // }, []);

  const onDownloadClick = useCallback((_inventoryId: string) => {
    //TODO: Implement download functionality
  }, []);

  return (
    <>
      <Box className="flex gap-1">
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

        {/* Rewards button
        <Tooltip title="Postular a sello">
          <span>
            <BaseIconButton
              disabled
              onClick={() => onRewardsClick(inventoryId)}
              aria-label="Postular a sello"
            >
              <EmojiEventsOutlined fontSize="small" />
            </BaseIconButton>
          </span>
        </Tooltip> */}

        {/* Duplicate button */}

        <Tooltip title="Duplicar huella">
          <span>
            <BaseIconButton
              onClick={() => null}
              color="primary"
              size="small"
              aria-label="Duplicar huella"
            >
              <FileCopyOutlined fontSize="small" />
            </BaseIconButton>
          </span>
        </Tooltip>

        {/* Delete button */}
        <Tooltip
          title={
            canDelete ? "Eliminar" : "No se puede eliminar este inventario"
          }
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
      />

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onClose={onDeleteCancel}
        onConfirm={onDeleteConfirm}
      />
    </>
  );
};
