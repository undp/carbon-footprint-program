import { FC, useState, useCallback, PropsWithChildren, useMemo } from "react";
import { Box, IconButtonProps, IconButton, Tooltip } from "@mui/material";
import {
  EditOutlined,
  FileDownloadOutlined,
  VerifiedOutlined,
  DeleteOutlined,
  FileCopyOutlined,
  SendOutlined,
  VisibilityOutlined,
  TaskAltRounded,
} from "@mui/icons-material";
import {
  GetAllCarbonInventoriesResponse,
  OrganizationDisplayStatusValues,
  SystemParameterKeyEnum,
  MeasurementRecognitionBehaviorEnum,
} from "@repo/types";
import {
  isCarbonInventoryEditable,
  isCarbonInventoryDeletable,
  canSubmitToVerification,
  canSubmitToMeasurement,
  canSelfDeclare,
} from "@repo/utils";
import { CalculationConfirmationDialog } from "./Dialogs/CalculationConfirmationDialog";
import { VerifyConfirmationDialog } from "./Dialogs/VerifyConfirmationDialog";
import { DeleteConfirmationDialog } from "./Dialogs/DeleteConfirmationDialog";
import { MissingOrganizationDialog } from "./Dialogs/MissingOrganizationDialog";
import { IncompleteInventoryDialog } from "./Dialogs/IncompleteInventoryDialog";
import { UnaccreditedOrganizationDialog } from "./Dialogs/UnaccreditedOrganizationDialog";
import { BlockedOrganizationDialog } from "./Dialogs/BlockedOrganizationDialog";
import { enqueueSnackbar } from "notistack";
import {
  useDeleteCarbonInventory,
  useRequestCalculation,
  useRequestVerification,
  useDuplicateCarbonInventory,
  usePreUploadSubmissionFiles,
  useSelfDeclareCarbonInventory,
  useSystemParameters,
} from "@/api/query";
import { Routes } from "@/interfaces";
import { useNavigate } from "@tanstack/react-router";
import { SelfDeclareCarbonInventoryDialog } from "./Dialogs/SelfDeclareCarbonInventoryDialog";

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
  carbonInventory: GetAllCarbonInventoriesResponse[number];
  inventories: GetAllCarbonInventoriesResponse;
}

export const InventoryActionsCell: FC<InventoryActionsCellProps> = ({
  carbonInventory,
  inventories,
}) => {
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [calculationDialogOpen, setCalculationDialogOpen] = useState(false);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [missingOrgDialogOpen, setMissingOrgDialogOpen] = useState(false);
  const [unaccreditedOrgDialogOpen, setUnaccreditedOrgDialogOpen] =
    useState(false);
  const [blockedOrgDialogOpen, setBlockedOrgDialogOpen] = useState(false);
  const [incompleteDialogOpen, setIncompleteDialogOpen] = useState(false);
  const [selfDeclareDialogOpen, setSelfDeclareDialogOpen] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  // for now, we can use the same method to check if the inventory is editable as the one to check if the inventory can request calculation

  const canEdit = isCarbonInventoryEditable(carbonInventory.status);

  const canRequestMeasurement = canSubmitToMeasurement(carbonInventory.status);

  const canRequestVerification = canSubmitToVerification(
    carbonInventory.status
  );

  const isSelfDeclared = carbonInventory.isSelfDeclared;

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

  const selfDeclareDisabled =
    !canSelfDeclare(carbonInventory.status) || isYearAlreadySelfDeclared;

  const selfDeclareTooltip = isSelfDeclared
    ? "Esta huella ya fue autodeclarada"
    : isYearAlreadySelfDeclared
      ? "Ya existe una huella autodeclarada para este año"
      : "Autodeclarar";

  const canDelete = isCarbonInventoryDeletable(carbonInventory.status);

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

  const { mutateAsync: selfDeclareClick, isPending: isSelfDeclareSubmitting } =
    useSelfDeclareCarbonInventory();
  const { mutateAsync: deleteInventory } = useDeleteCarbonInventory();
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
      await deleteInventory(carbonInventory.id);
      setDeleteDialogOpen(false);
      enqueueSnackbar("Huella eliminada", { variant: "success" });
    } catch {
      enqueueSnackbar("No se pudo eliminar la huella", {
        variant: "error",
      });
    }
  }, [carbonInventory.id, deleteInventory]);

  const onDeleteCancel = useCallback(() => {
    setDeleteDialogOpen(false);
  }, []);

  const getInventoryMissingFields = useCallback(() => {
    const fields: string[] = [];
    if (!carbonInventory.name) fields.push("nombre");
    if (carbonInventory.year == null) fields.push("año");
    return fields;
  }, [carbonInventory.name, carbonInventory.year]);

  const onCalculationClick = useCallback(() => {
    const fields = getInventoryMissingFields();
    if (fields.length > 0) {
      setMissingFields(fields);
      setIncompleteDialogOpen(true);
      return;
    }
    if (carbonInventory.organizationId === null) {
      setMissingOrgDialogOpen(true);
      return;
    }
    if (
      carbonInventory.organizationDisplayStatus ===
      OrganizationDisplayStatusValues.BLOCKED
    ) {
      setBlockedOrgDialogOpen(true);
      return;
    }
    if (
      carbonInventory.organizationDisplayStatus ===
      OrganizationDisplayStatusValues.NOT_ACCREDITED
    ) {
      setUnaccreditedOrgDialogOpen(true);
      return;
    }
    setCalculationDialogOpen(true);
  }, [
    getInventoryMissingFields,
    carbonInventory.organizationId,
    carbonInventory.organizationDisplayStatus,
  ]);

  const onCalculationConfirm = useCallback(async () => {
    try {
      await requestCalculation(carbonInventory.id);
      setCalculationDialogOpen(false);
      enqueueSnackbar("Solicitud de cálculo enviada", { variant: "success" });
    } catch {
      enqueueSnackbar("No se pudo enviar la solicitud de cálculo", {
        variant: "error",
      });
    }
  }, [carbonInventory.id, requestCalculation]);

  const onCalculationCancel = useCallback(() => {
    setCalculationDialogOpen(false);
  }, []);

  const onVerifyClick = useCallback(() => {
    const fields = getInventoryMissingFields();
    if (fields.length > 0) {
      setMissingFields(fields);
      setIncompleteDialogOpen(true);
      return;
    }
    if (carbonInventory.organizationId === null) {
      setMissingOrgDialogOpen(true);
      return;
    }
    if (
      carbonInventory.organizationDisplayStatus ===
      OrganizationDisplayStatusValues.BLOCKED
    ) {
      setBlockedOrgDialogOpen(true);
      return;
    }
    if (
      carbonInventory.organizationDisplayStatus ===
      OrganizationDisplayStatusValues.NOT_ACCREDITED
    ) {
      setUnaccreditedOrgDialogOpen(true);
      return;
    }
    setVerifyDialogOpen(true);
  }, [
    getInventoryMissingFields,
    carbonInventory.organizationId,
    carbonInventory.organizationDisplayStatus,
  ]);

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
          carbonInventoryId: carbonInventory.id,
          body: { fileUuids },
        });
        setVerifyDialogOpen(false);
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
    [carbonInventory.id, requestVerification, preUploadFiles]
  );

  const onVerifyCancel = useCallback(() => {
    setVerifyDialogOpen(false);
  }, []);

  const onDuplicateClick = useCallback(async () => {
    try {
      await duplicateInventory(carbonInventory.id);
      enqueueSnackbar("Huella duplicada", { variant: "success" });
    } catch {
      enqueueSnackbar("No se pudo duplicar la huella", {
        variant: "error",
      });
    }
  }, [carbonInventory.id, duplicateInventory]);

  const onDownloadClick = useCallback((_inventoryId: string) => {
    //TODO: Implement download functionality
  }, []);

  const onSelfDeclareClick = useCallback(() => {
    setSelfDeclareDialogOpen(true);
  }, []);

  const onSelfDeclareConfirm = useCallback(async () => {
    try {
      await selfDeclareClick(carbonInventory.id);
      enqueueSnackbar("Huella autodeclarada", { variant: "success" });
    } catch {
      enqueueSnackbar("No se pudo autodeclarar la huella", {
        variant: "error",
      });
    } finally {
      setSelfDeclareDialogOpen(false);
    }
  }, [carbonInventory.id, selfDeclareClick]);

  const onSelfDeclareCancel = useCallback(() => {
    setSelfDeclareDialogOpen(false);
  }, []);

  return (
    <>
      <Box className="flex justify-center gap-1">
        {/* Edit / View button */}
        {canEdit ? (
          <Tooltip title="Editar huella">
            <BaseIconButton
              onClick={() => onEditClick(carbonInventory.id)}
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
                onClick={() => onViewClick(carbonInventory.id)}
                color="primary"
                size="small"
                aria-label="Revisar huella"
              >
                <VisibilityOutlined fontSize="small" />
              </BaseIconButton>
            </span>
          </Tooltip>
        )}

        {/* Self Declare button */}
        {/*TODO: Remove validation messages on this tooltip when new design is implemented */}
        <Tooltip title={selfDeclareTooltip}>
          <span>
            <BaseIconButton
              onClick={onSelfDeclareClick}
              disabled={selfDeclareDisabled}
              aria-label="Autodeclarar"
            >
              <TaskAltRounded fontSize="small" />
            </BaseIconButton>
          </span>
        </Tooltip>

        {/* Request Calculation button */}
        {recognitionBehavior === MeasurementRecognitionBehaviorEnum.MANUAL && (
          <Tooltip title="Enviar a cálculo">
            <span>
              <BaseIconButton
                onClick={onCalculationClick}
                disabled={!canRequestMeasurement || !isSelfDeclared}
                aria-label="Enviar a cálculo"
              >
                <SendOutlined fontSize="small" />
              </BaseIconButton>
            </span>
          </Tooltip>
        )}

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
              onClick={() => onDownloadClick(carbonInventory.id)}
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

      <SelfDeclareCarbonInventoryDialog
        open={selfDeclareDialogOpen}
        onClose={onSelfDeclareCancel}
        onConfirm={onSelfDeclareConfirm}
        isLoading={isSelfDeclareSubmitting}
        isAutomaticRecognition={
          recognitionBehavior === MeasurementRecognitionBehaviorEnum.AUTOMATIC
        }
      />

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

      <IncompleteInventoryDialog
        open={incompleteDialogOpen}
        onClose={() => setIncompleteDialogOpen(false)}
        missingFields={missingFields}
      />
    </>
  );
};
