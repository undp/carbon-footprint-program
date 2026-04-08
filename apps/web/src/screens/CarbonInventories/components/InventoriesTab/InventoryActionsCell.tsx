import { FC, useState, useCallback, useMemo } from "react";
import { Box, Tooltip } from "@mui/material";
import {
  VisibilityOutlined,
  FileDownloadOutlined,
  SendOutlined,
  VerifiedOutlined,
  HistoryOutlined,
} from "@mui/icons-material";
import {
  GetAllCarbonInventoriesResponse,
  OrganizationDisplayStatusValues,
  SystemParameterKeyEnum,
  MeasurementRecognitionBehaviorEnum,
} from "@repo/types";
import { canSubmitToVerification, canSubmitToMeasurement } from "@repo/utils";
import { BaseActionButton } from "../BaseActionButton";
import { CalculationConfirmationDialog } from "../Dialogs/CalculationConfirmationDialog";
import { VerifyConfirmationDialog } from "../Dialogs/VerifyConfirmation";
import { MissingOrganizationDialog } from "../Dialogs/MissingOrganizationDialog";
import { UnaccreditedOrganizationDialog } from "../Dialogs/UnaccreditedOrganizationDialog";
import { BlockedOrganizationDialog } from "../Dialogs/BlockedOrganizationDialog";
import { IncompleteInventoryDialog } from "../Dialogs/IncompleteInventoryDialog";
import { ViewSubmissionDialog } from "@/components/dialogs/SubmissionHistory";
import { enqueueSnackbar } from "notistack";
import {
  useRequestCalculation,
  useRequestVerification,
  usePreUploadSubmissionFiles,
  useSystemParameters,
} from "@/api/query";
import { Routes } from "@/interfaces";
import { useNavigate } from "@tanstack/react-router";

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
  const [missingFields, setMissingFields] = useState<string[]>([]);
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

  const { mutateAsync: requestCalculation } = useRequestCalculation();
  const { mutateAsync: requestVerification } = useRequestVerification();
  const { preUploadFiles } = usePreUploadSubmissionFiles();

  const onViewClick = useCallback(() => {
    void navigate({
      to: Routes.CARBON_INVENTORY_EMISSION_SUMMARY,
      params: { inventoryId: carbonInventory.id },
    });
  }, [navigate, carbonInventory.id]);

  const getInventoryMissingFields = useCallback(() => {
    const fields: string[] = [];
    if (!carbonInventory.name) fields.push("nombre");
    if (carbonInventory.year == null) fields.push("año");
    return fields;
  }, [carbonInventory.name, carbonInventory.year]);

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

  return (
    <>
      <Box className="justify-left flex items-center gap-2">
        {/* Ver huella */}
        <Tooltip title="Ver huella">
          <span>
            <BaseActionButton onClick={onViewClick} aria-label="Ver huella">
              <VisibilityOutlined fontSize="small" />
            </BaseActionButton>
          </span>
        </Tooltip>

        {/* Descargar (deshabilitado) */}
        <Tooltip title="Descargar (próximamente)">
          <span>
            <BaseActionButton disabled aria-label="Descargar">
              <FileDownloadOutlined fontSize="small" />
            </BaseActionButton>
          </span>
        </Tooltip>

        {/* Enviar a cálculo */}
        {recognitionBehavior === MeasurementRecognitionBehaviorEnum.MANUAL && (
          <Tooltip title="Enviar a cálculo">
            <span>
              <BaseActionButton
                onClick={onCalculationClick}
                disabled={
                  !canRequestMeasurement || !carbonInventory.isSelfDeclared
                }
                aria-label="Enviar a cálculo"
              >
                <SendOutlined fontSize="small" />
              </BaseActionButton>
            </span>
          </Tooltip>
        )}

        {/* Enviar a verificación */}
        <Tooltip title="Enviar a verificación">
          <span>
            <BaseActionButton
              onClick={onVerifyClick}
              disabled={!canRequestVerification}
              aria-label="Enviar a verificación"
            >
              <VerifiedOutlined fontSize="small" />
            </BaseActionButton>
          </span>
        </Tooltip>

        {/* Historial */}
        <Tooltip title="Historial">
          <span>
            <BaseActionButton
              onClick={() => setHistoryDialogOpen(true)}
              aria-label="Historial"
            >
              <HistoryOutlined fontSize="small" />
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
