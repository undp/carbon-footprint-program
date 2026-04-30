import { FC, useState, useCallback, useMemo } from "react";
import { Box, Button, CircularProgress, Tooltip } from "@mui/material";
import {
  EditOutlined,
  DeleteOutlined,
  FileCopyOutlined,
  FileDownloadOutlined,
  TaskAltRounded,
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
import { Routes } from "@/interfaces";
import { useNavigate } from "@tanstack/react-router";
import { BaseActionButton } from "../BaseActionButton";
import {
  useCarbonInventoriesStore,
  CarbonInventoriesTab,
} from "../../hooks/useCarbonInventoriesStore";
import { useDownloadCarbonInventory } from "../../hooks/useDownloadCarbonInventory";

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
  const [selfDeclareValidationReason, setSelfDeclareValidationReason] =
    useState<SelfDeclareValidationReason>(null);

  const canDelete = isCarbonInventoryDeletable(carbonInventory.status);

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
    if (!carbonInventory.hasCompletedLines) {
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
    carbonInventory.hasCompletedLines,
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
        <Tooltip title="Editar huella">
          <BaseActionButton onClick={onEditClick} aria-label="Editar huella">
            <EditOutlined fontSize="small" />
          </BaseActionButton>
        </Tooltip>

        {/* Duplicar */}
        <Tooltip title="Duplicar huella">
          <span>
            <BaseActionButton
              onClick={onDuplicateClick}
              disabled={isDuplicating}
              aria-label="Duplicar huella"
            >
              <FileCopyOutlined fontSize="small" />
            </BaseActionButton>
          </span>
        </Tooltip>

        {/* Descargar */}
        <Tooltip
          title={
            isDownloading
              ? "Descargando..."
              : carbonInventory.totalEmissions === 0
                ? "Sin datos de emisiones"
                : "Descargar"
          }
        >
          <span>
            <BaseActionButton
              onClick={onDownloadClick}
              disabled={isDownloading || carbonInventory.totalEmissions === 0}
              aria-label="Descargar"
            >
              {isDownloading ? (
                <CircularProgress size={16} />
              ) : (
                <FileDownloadOutlined fontSize="small" />
              )}
            </BaseActionButton>
          </span>
        </Tooltip>

        {/* Autodeclarar */}
        <Tooltip title={"Autodeclarar"}>
          <span>
            <Button
              variant="contained"
              size="small"
              startIcon={<TaskAltRounded sx={{ fontSize: 16 }} />}
              onClick={onSelfDeclareClick}
              disableElevation
              sx={(theme) => ({
                minHeight: 30,
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.75rem",
                minWidth: "auto",
                px: 1.5,
                py: 0.5,
                borderRadius: "4px",
                backgroundColor: theme.palette.primary.main,
                "&:hover": {
                  backgroundColor: theme.palette.primary.dark,
                },
              })}
              aria-label="Autodeclarar"
            >
              Autodeclarar
            </Button>
          </span>
        </Tooltip>

        {/* Eliminar */}
        <Tooltip
          title={canDelete ? "Eliminar" : "No se puede eliminar esta huella"}
        >
          <span>
            <BaseActionButton
              onClick={() => setDeleteDialogOpen(true)}
              disabled={!canDelete}
              aria-label="Eliminar"
            >
              <DeleteOutlined fontSize="small" />
            </BaseActionButton>
          </span>
        </Tooltip>
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
    </>
  );
};
