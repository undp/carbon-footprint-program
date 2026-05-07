import { FC, useState, useCallback, useMemo } from "react";
import { Badge, Box, CircularProgress, Tooltip } from "@mui/material";
import {
  VisibilityOutlined,
  FileDownloadOutlined,
  SendOutlined,
  VerifiedOutlined,
  DescriptionOutlined,
  FileCopyOutlined,
  EditOutlined,
} from "@mui/icons-material";
import {
  GetAllCarbonInventoriesResponse,
  OrganizationDisplayStatusValues,
  SystemParameterKeyEnum,
  MeasurementRecognitionBehaviorEnum,
  CarbonInventoryDisplayStatusEnum,
} from "@repo/types";
import {
  canSubmitToVerification,
  canSubmitToMeasurement,
  isCarbonInventoryEditable,
} from "@repo/utils";
import { BaseActionButton } from "../BaseActionButton";
import { CalculationConfirmationDialog } from "../Dialogs/CalculationConfirmationDialog";
import { VerifyConfirmationDialog } from "../Dialogs/VerifyConfirmation";
import { MissingOrganizationDialog } from "../Dialogs/MissingOrganizationDialog";
import { UnaccreditedOrganizationDialog } from "../Dialogs/UnaccreditedOrganizationDialog";
import { BlockedOrganizationDialog } from "../Dialogs/BlockedOrganizationDialog";
import {
  IncompleteInventoryDialog,
  IncompleteInventoryField,
} from "../Dialogs/IncompleteInventoryDialog";
import { ViewSubmissionDialog } from "@/components/dialogs/SubmissionHistory";
import { enqueueSnackbar } from "notistack";
import {
  useRequestCalculation,
  useRequestVerification,
  usePreUploadSubmissionFiles,
  useSystemParameters,
  useDuplicateCarbonInventory,
} from "@/api/query";
import { Routes } from "@/interfaces";
import {
  useCarbonInventoriesStore,
  CarbonInventoriesTab,
} from "../../hooks/useCarbonInventoriesStore";
import { useNavigate } from "@tanstack/react-router";
import { useDownloadCarbonInventory } from "@/hooks";

interface InventoryActionsCellProps {
  carbonInventory: GetAllCarbonInventoriesResponse[number];
}

export const InventoryActionsCell: FC<InventoryActionsCellProps> = ({
  carbonInventory,
}) => {
  const navigate = useNavigate();
  const [calculationDialogOpen, setCalculationDialogOpen] = useState(false);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [missingOrgDialogOpen, setMissingOrgDialogOpen] = useState(false);
  const [unaccreditedOrgDialogOpen, setUnaccreditedOrgDialogOpen] =
    useState(false);
  const [blockedOrgDialogOpen, setBlockedOrgDialogOpen] = useState(false);
  const [incompleteDialogOpen, setIncompleteDialogOpen] = useState(false);
  const [missingFields, setMissingFields] = useState<
    IncompleteInventoryField[]
  >([]);
  const [isVerifySubmitting, setIsVerifySubmitting] = useState(false);

  const canRequestMeasurement = canSubmitToMeasurement(carbonInventory.status);
  const canRequestVerification = canSubmitToVerification(
    carbonInventory.status
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
  const { mutateAsync: requestCalculation } = useRequestCalculation();
  const { mutateAsync: requestVerification } = useRequestVerification();
  const { mutateAsync: duplicateInventory, isPending: isDuplicating } =
    useDuplicateCarbonInventory();
  const { download, isDownloading } = useDownloadCarbonInventory();
  const { preUploadFiles } = usePreUploadSubmissionFiles();

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

  const onDuplicateClick = useCallback(async () => {
    try {
      await duplicateInventory(carbonInventory.id);
      enqueueSnackbar("Huella duplicada", { variant: "success" });
      setActiveTab(CarbonInventoriesTab.DRAFTS);
    } catch {
      enqueueSnackbar("No se pudo duplicar la huella", { variant: "error" });
    }
  }, [carbonInventory.id, duplicateInventory, setActiveTab]);

  const onEditClick = useCallback(() => {
    void navigate({
      to: Routes.CARBON_INVENTORY_BUSINESS_PROFILING,
      params: { inventoryId: carbonInventory.id },
    });
  }, [carbonInventory.id, navigate]);

  const onViewClick = useCallback(() => {
    const href = Routes.CARBON_INVENTORY_EMISSION_SUMMARY.replace(
      "$inventoryId",
      carbonInventory.id
    );
    window.open(href, "_blank", "noopener,noreferrer");
  }, [carbonInventory.id]);

  const getInventoryMissingFields = useCallback(() => {
    const fields: IncompleteInventoryField[] = [];
    if (!carbonInventory.name) fields.push(IncompleteInventoryField.NAME);
    if (carbonInventory.year == null)
      fields.push(IncompleteInventoryField.YEAR);
    if (!carbonInventory.hasActiveLines) {
      fields.push(IncompleteInventoryField.LINES);
    } else if (!carbonInventory.areAllActiveLinesCompleted) {
      fields.push(IncompleteInventoryField.COMPLETED_LINES);
    }
    return fields;
  }, [
    carbonInventory.name,
    carbonInventory.year,
    carbonInventory.hasActiveLines,
    carbonInventory.areAllActiveLinesCompleted,
  ]);

  const validateOrganization = useCallback(() => {
    const fields = getInventoryMissingFields();
    if (fields.length > 0) {
      setMissingFields(fields);
      setIncompleteDialogOpen(true);
      return false;
    }
    if (carbonInventory.organizationId === null) {
      setMissingOrgDialogOpen(true);
      return false;
    }
    if (
      carbonInventory.organizationDisplayStatus ===
      OrganizationDisplayStatusValues.BLOCKED
    ) {
      setBlockedOrgDialogOpen(true);
      return false;
    }
    if (
      carbonInventory.organizationDisplayStatus ===
      OrganizationDisplayStatusValues.NOT_ACCREDITED
    ) {
      setUnaccreditedOrgDialogOpen(true);
      return false;
    }
    return true;
  }, [
    getInventoryMissingFields,
    carbonInventory.organizationId,
    carbonInventory.organizationDisplayStatus,
  ]);

  const onCalculationClick = useCallback(() => {
    if (validateOrganization()) {
      setCalculationDialogOpen(true);
    }
  }, [validateOrganization]);

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

  const onVerifyClick = useCallback(() => {
    if (validateOrganization()) {
      setVerifyDialogOpen(true);
    }
  }, [validateOrganization]);

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
          id: carbonInventory.id,
          body: { fileUuids },
        });
        setVerifyDialogOpen(false);
        enqueueSnackbar("Solicitud reconocimiento de verificación enviada", {
          variant: "success",
        });
      } catch {
        enqueueSnackbar(
          "No se pudo enviar la solicitud de reconocimiento de verificación",
          {
            variant: "error",
          }
        );
      } finally {
        setIsVerifySubmitting(false);
      }
    },
    [carbonInventory.id, requestVerification, preUploadFiles]
  );

  return (
    <>
      <Box className="justify-left flex items-center gap-2">
        {isCarbonInventoryEditable(carbonInventory.status) ? (
          <Tooltip title="Editar huella">
            <BaseActionButton onClick={onEditClick} aria-label="Editar huella">
              <EditOutlined fontSize="small" />
            </BaseActionButton>
          </Tooltip>
        ) : (
          <Tooltip title="Ver huella">
            <span>
              <BaseActionButton onClick={onViewClick} aria-label="Ver huella">
                <VisibilityOutlined fontSize="small" />
              </BaseActionButton>
            </span>
          </Tooltip>
        )}

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

        {/* Postular a reconocimiento de medición */}
        {recognitionBehavior === MeasurementRecognitionBehaviorEnum.MANUAL && (
          <Tooltip title="Postular a reconocimiento de medición">
            <span>
              <BaseActionButton
                onClick={onCalculationClick}
                disabled={
                  !canRequestMeasurement || !carbonInventory.isSelfDeclared
                }
                aria-label="Postular a reconocimiento de medición"
              >
                <SendOutlined fontSize="small" />
              </BaseActionButton>
            </span>
          </Tooltip>
        )}

        {/* Postular a Reconocimiento */}
        <Tooltip title="Postular a reconocimiento de verificación">
          <span>
            <BaseActionButton
              onClick={onVerifyClick}
              disabled={!canRequestVerification}
              aria-label="Postular a reconocimiento de verificación"
            >
              <VerifiedOutlined fontSize="small" />
            </BaseActionButton>
          </span>
        </Tooltip>

        {/* Historial */}
        <Tooltip title="Historial">
          <span>
            <Badge
              variant="dot"
              invisible={
                carbonInventory.status !==
                  CarbonInventoryDisplayStatusEnum.CALCULATION_REVIEWED &&
                carbonInventory.status !==
                  CarbonInventoryDisplayStatusEnum.VERIFICATION_REVIEWED
              }
              overlap="circular"
              sx={{
                "& .MuiBadge-badge": {
                  top: 2,
                  right: 2,
                  backgroundColor: (theme) => theme.palette.warning.main,
                },
              }}
            >
              <BaseActionButton
                onClick={() => setHistoryDialogOpen(true)}
                aria-label="Historial"
              >
                <DescriptionOutlined fontSize="small" />
              </BaseActionButton>
            </Badge>
          </span>
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
      </Box>

      <CalculationConfirmationDialog
        open={calculationDialogOpen}
        onClose={() => setCalculationDialogOpen(false)}
        onConfirm={onCalculationConfirm}
      />

      <VerifyConfirmationDialog
        open={verifyDialogOpen}
        onClose={() => setVerifyDialogOpen(false)}
        onConfirm={onVerifyConfirm}
        isLoading={isVerifySubmitting}
        organizationId={carbonInventory.organizationId}
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

      {historyDialogOpen && (
        <ViewSubmissionDialog
          open={historyDialogOpen}
          carbonInventoryId={carbonInventory.id}
          onClose={() => setHistoryDialogOpen(false)}
        />
      )}
    </>
  );
};
