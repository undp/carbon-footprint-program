import { FC, useCallback, useEffect, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Divider,
  CircularProgress,
  Box,
  Typography,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { DevTool } from "@hookform/devtools";
import {
  IS_DEVELOPMENT,
  LOCAL_BYPASS_REQUIRED_FIELDS,
} from "../../../../config/environment";
import { GetOrganizationByIdResponse } from "@repo/types";
import { TAX_ID_LABEL } from "@repo/constants";
import {
  useOrganizationForm,
  useOrganizationSubmit,
  useOrganizationData,
  useTerritorySelectors,
} from "./hooks";
import { LocationFields } from "./LocationFields";
import { DialogMode } from "../../types";
import {
  FormTextField,
  FormSelectField,
  FormAutocompleteField,
  FormNumericField,
  ConfirmDialog,
  FormFileUpload,
} from "@/components";
import { InfoButton } from "@/components/InfoButton";
import { useConfirmDialog } from "@/hooks";
import { VOCAB } from "@/config/vocab";
import {
  REPRESENTATIVE_DOCUMENT_HELPER_TEXT,
  REPRESENTATIVE_DOCUMENT_LABEL,
} from "../../constants";

interface Props {
  open: boolean;
  onClose: () => void;
  organization?: GetOrganizationByIdResponse;
  mode?: DialogMode;
  onCreated?: (organizationId: string) => void;
}

const DIALOG_TITLES: Record<DialogMode, string> = {
  [DialogMode.create]: `Crear perfil de ${VOCAB.organization.article.singular}`,
  [DialogMode.edit]: `Editar perfil de ${VOCAB.organization.article.singular}`,
  [DialogMode.accredited]: `Editar perfil de ${VOCAB.organization.article.singular}`,
};

const BUTTON_LABELS: Record<DialogMode, string> = {
  [DialogMode.create]: "Crear",
  [DialogMode.edit]: "Guardar cambios",
  [DialogMode.accredited]: "Solicitar revisión",
};

export const OrganizationFormDialog: FC<Props> = ({
  open,
  onClose,
  organization,
  mode = DialogMode.create,
  onCreated,
}) => {
  const {
    control,
    handleSubmit,
    reset,
    selectedSectorId,
    territoryIds,
    formState,
  } = useOrganizationForm({ organization });

  const { submit, isSubmitting } = useOrganizationSubmit({
    mode,
    organizationId: organization?.id,
    onSuccess: onClose,
    onCreated,
  });

  const {
    sectorOptions,
    subsectorSelectOptions,
    secondarySubsectorOptions,
    companySizeOptions,
    sectorsLoading,
    organizationSizesLoading,
    activityOptions,
    activitiesLoading,
    jobPositionOptions,
    jobPositionsLoading,
  } = useOrganizationData({
    selectedSectorId: selectedSectorId || undefined,
    initialSector: organization?.sector,
    initialSubsector: organization?.subsector,
    initialSecondarySubsector: organization?.secondarySubsector,
    initialMainActivity: organization?.mainActivity,
    initialOrganizationSize: organization?.countryOrganizationSize,
  });

  const territoryLevels = useTerritorySelectors(territoryIds);

  const confirmDialog = useConfirmDialog();

  const handleClose = useCallback(() => {
    if (formState.isDirty) {
      confirmDialog.openConfirm({
        title: "Cambios sin guardar",
        message: "¿Descartar cambios? Los datos no guardados se perderán.",
        variant: "error",
        confirmLabel: "Descartar",
        cancelLabel: "Cancelar",
      });
      return;
    }
    reset();
    onClose();
  }, [formState.isDirty, reset, onClose, confirmDialog]);

  const handleConfirmDiscard = useCallback(() => {
    confirmDialog.closeConfirm();
    reset();
    onClose();
  }, [confirmDialog, reset, onClose]);

  // Focus management
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
    }
  }, [open]);

  const buttonActionLabel = BUTTON_LABELS[mode];

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      scroll="body"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            overflow: "hidden",
          },
        },
      }}
      aria-labelledby="company-accreditation-dialog-title"
    >
      <DialogTitle
        id="company-accreditation-dialog-title"
        sx={{ pr: 6, fontWeight: 600, fontSize: 24 }}
      >
        {DIALOG_TITLES[mode]}
      </DialogTitle>
      <IconButton
        aria-label="cerrar"
        onClick={handleClose}
        sx={(theme) => ({
          position: "absolute",
          right: 16,
          top: 16,
          color: theme.palette.grey[500],
        })}
      >
        <Close />
      </IconButton>

      <form onSubmit={handleSubmit(submit)} noValidate>
        <DialogContent sx={{ pt: 0, maxHeight: "calc(90vh - 160px)" }}>
          {/* Organization Information Section */}
          <Box className="mb-6">
            <Box className="mb-4 flex items-center gap-2">
              <Typography variant="body1" fontSize={18}>
                Ingreso de datos de {VOCAB.organization.article.singular}
              </Typography>
              <InfoButton
                label={`Ingresa los datos de tu ${VOCAB.organization.noun.singular} para ${VOCAB.inscription.article.singular}`}
                size="small"
              />
            </Box>

            <Box className="flex flex-col gap-4">
              {/* Row 1: Legal Name + Commercial Name */}
              <Box className="flex gap-6">
                <FormTextField
                  name="legalName"
                  control={control}
                  label="Nombre legal de la entidad / Razón social"
                  required
                  autoFocus
                />
                <FormTextField
                  name="tradeName"
                  control={control}
                  label="Nombre comercial"
                />
              </Box>

              {/* Row 2: Tax ID + Organization Type */}
              <Box className="flex gap-6">
                <FormTextField
                  name="taxId"
                  control={control}
                  label={TAX_ID_LABEL}
                  required={!LOCAL_BYPASS_REQUIRED_FIELDS}
                />
                <FormSelectField
                  name="countryOrganizationSizeId"
                  control={control}
                  label={`Tipo / Tamaño ${VOCAB.organization.noun.singular}`}
                  options={companySizeOptions}
                  disabled={organizationSizesLoading}
                />
              </Box>

              {/* Row 3: Economic Sector + Sub-sector */}
              <Box className="flex gap-6">
                <FormSelectField
                  name="sectorId"
                  control={control}
                  label="Sector"
                  options={sectorOptions}
                  disabled={sectorsLoading}
                />
                <FormSelectField
                  name="subsectorId"
                  control={control}
                  label={
                    selectedSectorId
                      ? "Actividad económica principal"
                      : "Selecciona el sector"
                  }
                  options={subsectorSelectOptions}
                  disabled={
                    sectorsLoading ||
                    !selectedSectorId ||
                    subsectorSelectOptions.length === 0
                  }
                />
              </Box>

              {/* Row 4: Secondary Economic Activity */}
              <Box className="flex gap-6">
                <FormAutocompleteField
                  name="secondarySubsectorId"
                  control={control}
                  label="Actividad económica secundaria (Opcional)"
                  labelId="secondary-subsector-label"
                  options={secondarySubsectorOptions}
                  loading={sectorsLoading}
                  disabled={
                    sectorsLoading || secondarySubsectorOptions.length === 0
                  }
                  className="flex-1"
                />
                <Box className="flex-1" />
              </Box>

              {/* Row 5: Employee Count + Main Activity */}
              <Box className="flex gap-6">
                <FormNumericField
                  name="employeesCount"
                  control={control}
                  label="Cantidad de trabajadores"
                  className="flex-1"
                  disabled={organizationSizesLoading}
                  min={0}
                  minMessage="La cantidad no puede ser negativa"
                  onlyInteger
                  onlyIntegerMessage="La cantidad debe ser un número entero"
                />
                <FormAutocompleteField
                  name="mainActivityId"
                  control={control}
                  label={`Unidad de actividad de ${VOCAB.organization.article.singular}`}
                  labelId="activity-label"
                  options={activityOptions}
                  loading={activitiesLoading}
                  disabled={activitiesLoading || activityOptions.length === 0}
                  className="flex-1"
                />
              </Box>
            </Box>
          </Box>

          <Divider sx={{ mb: 3, opacity: 0.2 }} />

          {/* Location Section */}
          <Box className="mb-6">
            <Box className="mb-4 flex items-center gap-2">
              <Typography variant="body1" fontSize={18}>
                Ubicación
              </Typography>
              <InfoButton
                label="Selecciona la ubicación territorial hasta el nivel que conozcas y agrega la dirección física"
                size="small"
              />
            </Box>

            <Box className="flex flex-col gap-4">
              <LocationFields control={control} levels={territoryLevels} />
            </Box>
          </Box>

          <Divider sx={{ mb: 3, opacity: 0.2 }} />

          {/* Representative Information Section */}
          <Box>
            <Box className="mb-4 flex items-center gap-2">
              <Typography variant="body1" fontSize={18}>
                Ingreso de datos del representante legal o responsable
                institucional
              </Typography>
              <InfoButton
                label={`Ingresa los datos del representante legal de tu ${VOCAB.organization.noun.singular}`}
                size="small"
              />
            </Box>

            <Box className="flex flex-col gap-4">
              {/* Row 1: Name + identity document */}
              <Box className="flex gap-6">
                <FormTextField
                  name="representativeFullName"
                  control={control}
                  label="Nombre completo"
                  required={!LOCAL_BYPASS_REQUIRED_FIELDS}
                />
                <FormTextField
                  name="representativeTaxId"
                  control={control}
                  label={REPRESENTATIVE_DOCUMENT_LABEL}
                  helperText={REPRESENTATIVE_DOCUMENT_HELPER_TEXT}
                  required={!LOCAL_BYPASS_REQUIRED_FIELDS}
                />
              </Box>

              {/* Row 2: Position + Phone */}
              <Box className="flex gap-6">
                <FormSelectField
                  name="representativePositionId"
                  control={control}
                  label="Cargo"
                  options={jobPositionOptions}
                  disabled={jobPositionsLoading}
                  required={!LOCAL_BYPASS_REQUIRED_FIELDS}
                />
                <FormTextField
                  name="representativePhone"
                  control={control}
                  label="Teléfono"
                  required={!LOCAL_BYPASS_REQUIRED_FIELDS}
                />
              </Box>

              {/* Row 3: Email */}
              <Box className="flex gap-6">
                <FormTextField
                  name="representativeEmail"
                  control={control}
                  label="Correo"
                  className="flex-1"
                  required={!LOCAL_BYPASS_REQUIRED_FIELDS}
                />
                <Box className="flex-1" />
              </Box>
            </Box>
          </Box>

          {mode === DialogMode.accredited && (
            <>
              <Divider sx={{ mb: 3, opacity: 0.2 }} />

              <Box className="mb-4 flex items-center gap-2">
                <Typography variant="body1" fontSize={18}>
                  Documentos de respaldo
                </Typography>
              </Box>
              <FormFileUpload
                control={control}
                name="files"
                disabled={isSubmitting}
                required={!LOCAL_BYPASS_REQUIRED_FIELDS}
                requiredMessage="Al menos un archivo es requerido"
              />
            </>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: 1,
            borderColor: "divider",
            backgroundColor: "background.paper",
          }}
        >
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={isSubmitting}
            startIcon={
              isSubmitting ? (
                <CircularProgress size={20} color="inherit" />
              ) : undefined
            }
          >
            {buttonActionLabel}
          </Button>
        </DialogActions>
      </form>
      {IS_DEVELOPMENT && <DevTool control={control} />}
      <ConfirmDialog
        open={confirmDialog.isOpen}
        onClose={confirmDialog.closeConfirm}
        onConfirm={handleConfirmDiscard}
        title={confirmDialog.title}
        message={confirmDialog.message}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
        confirmLabel={confirmDialog.confirmLabel}
        cancelLabel={confirmDialog.cancelLabel}
      />
    </Dialog>
  );
};
