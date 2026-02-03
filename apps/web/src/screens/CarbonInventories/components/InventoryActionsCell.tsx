import { FC, useState, useCallback, PropsWithChildren } from "react";
import { Box, ButtonProps, IconButton, Tooltip } from "@mui/material";
import {
  EditOutlined,
  FileDownloadOutlined,
  VerifiedOutlined,
  DeleteOutlined,
  EmojiEventsOutlined,
  FileCopyOutlined,
} from "@mui/icons-material";
import { InventoryStatus } from "@repo/types";
import { VerifyConfirmationDialog } from "./Dialogs/VerifyConfirmationDialog";
import { DeleteConfirmationDialog } from "./Dialogs/DeleteConfirmationDialog";
import { enqueueSnackbar } from "notistack";
import { useUpdateCarbonInventory } from "@/api/query";
import { Routes } from "@/interfaces";
import { useNavigate } from "@tanstack/react-router";
import { QueryObserverResult, RefetchOptions } from "@tanstack/react-query";

const BaseIconButton: FC<PropsWithChildren<ButtonProps>> = ({
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
  status: InventoryStatus;
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
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);

  const isDraft = status === "DRAFT";
  const isVerified = status === "VERIFIED";
  const canEdit = !isVerified;
  const canVerify = status === "SUBMITTED";
  const canDelete = !isVerified;
  const canView = !isDraft;

  const { mutateAsync: updateInventory } = useUpdateCarbonInventory();

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
      await updateInventory({
        id: inventoryId,
        data: { status: "DELETED" },
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

  const onVerifyClick = useCallback(() => {
    setVerifyDialogOpen(true);
  }, []);

  const onVerifyConfirm = useCallback(() => {
    //TODO: Implement with actual verify functionality
    setVerifyDialogOpen(false);
  }, []);

  const onVerifyCancel = useCallback(() => {
    setVerifyDialogOpen(false);
  }, []);

  const onRewardsClick = useCallback((inventoryId: string) => {
    //TODO: Implement rewards functionality
  }, []);

  const onDownloadClick = useCallback((inventoryId: string) => {
    //TODO: Implement download functionality
  }, []);

  return (
    <>
      <Box sx={{ display: "flex", gap: 0.5 }}>
        {/* Edit / View button */}
        {canView ? (
          <Tooltip title="Revisar huella">
            <span>
              <BaseIconButton
                onClick={() => onViewClick(inventoryId)}
                color="primary"
                size="small"
              >
                <FileCopyOutlined fontSize="small" />
              </BaseIconButton>
            </span>
          </Tooltip>
        ) : (
          <Tooltip title="Editar huella">
            <BaseIconButton
              onClick={() => onEditClick(inventoryId)}
              disabled={!canEdit}
            >
              <EditOutlined fontSize="small" />
            </BaseIconButton>
          </Tooltip>
        )}

        {/* Download button */}
        <Tooltip title="Descargar">
          <span>
            <BaseIconButton
              disabled
              onClick={() => onDownloadClick(inventoryId)}
            >
              <FileDownloadOutlined fontSize="small" />
            </BaseIconButton>
          </span>
        </Tooltip>

        {/* Verify button */}
        <Tooltip title={"Ver Diploma o sello"}>
          <span>
            <BaseIconButton onClick={onVerifyClick} disabled={!canVerify}>
              <VerifiedOutlined fontSize="small" />
            </BaseIconButton>
          </span>
        </Tooltip>

        {/* Rewards button */}
        <Tooltip title="Postular a sello">
          <span>
            <BaseIconButton
              disabled
              onClick={() => onRewardsClick(inventoryId)}
            >
              <EmojiEventsOutlined fontSize="small" />
            </BaseIconButton>
          </span>
        </Tooltip>

        {/* Delete button */}
        <Tooltip
          title={
            canDelete
              ? "Eliminar"
              : "No se puede eliminar un inventario verificado"
          }
        >
          <span>
            <BaseIconButton onClick={onDeleteClick} disabled={!canDelete}>
              <DeleteOutlined fontSize="small" />
            </BaseIconButton>
          </span>
        </Tooltip>
      </Box>

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
