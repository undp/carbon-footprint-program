import { FC, useCallback, useMemo } from "react";
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
import { IS_DEVELOPMENT } from "../../../../config/environment";
import { GetOrganizationByIdResponse } from "@repo/types";
import {
  useOrganizationForm,
  useOrganizationSubmit,
  useOrganizationData,
} from "./hooks";
import { DialogMode } from "../../types";
import {
  FormTextField,
  FormSelectField,
  FormAutocompleteField,
  FormNumericField,
} from "@/components";
import { InfoButton } from "@/components/InfoButton";

interface Props {
  open: boolean;
  onClose: () => void;
  organization?: GetOrganizationByIdResponse;
  mode?: DialogMode;
}

const DIALOG_TITLES: Record<DialogMode, string> = {
  create: "Crear perfil de empresa",
  edit: "Editar perfil de empresa",
  accreditation: "Acreditación de la empresa",
};

export const OrganizationFormDialog: FC<Props> = ({
  open,
  onClose,
  organization,
  mode = "accreditation",
}) => {
  const { control, handleSubmit, reset, selectedSectorId } =
    useOrganizationForm({ organization });

  const { submit, isSubmitting } = useOrganizationSubmit({
    mode,
    organizationId: organization?.id,
    onSuccess: onClose,
  });

  const {
    sectorOptions,
    subsectorSelectOptions,
    companySizeOptions,
    sectorsLoading,
    organizationSizesLoading,
    activityOptions,
    activitiesLoading,
    jobPositionOptions,
    jobPositionsLoading,
  } = useOrganizationData({
    selectedSectorId: selectedSectorId || undefined,
  });

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const buttonActionLabel = useMemo(() => {
    switch (mode) {
      case "create":
        return "Crear";
      case "edit":
        return "Guardar cambios";
      case "accreditation":
        return "Enviar";
      default:
        return "Guardar";
    }
  }, [mode]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            maxHeight: "90vh",
            borderRadius: 1,
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
        <DialogContent
          sx={{ pt: 0, overflow: "auto", maxHeight: "calc(90vh - 160px)" }}
        >
          {/* Organization Information Section */}
          <Box className="mb-6">
            <Box className="mb-4 flex items-center gap-2">
              <Typography variant="body1" fontSize={18}>
                Ingreso de datos de la organización
              </Typography>
              <InfoButton
                label="Ingresa los datos de tu organización para la acreditación"
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
                  label="RUT / RUC / ID Tributario"
                  required
                />
                <FormSelectField
                  name="countryOrganizationSizeId"
                  control={control}
                  label="Tipo / Tamaño organización"
                  options={companySizeOptions}
                  disabled={organizationSizesLoading}
                />
              </Box>

              {/* Row 3: Economic Sector + Sub-sector */}
              <Box className="flex gap-6">
                <FormSelectField
                  name="sectorId"
                  control={control}
                  label="Rubro / Sector económico"
                  options={sectorOptions}
                  disabled={sectorsLoading}
                />
                <FormSelectField
                  name="subsectorId"
                  control={control}
                  label={selectedSectorId ? "Sub-rubro" : "Selecciona el rubro"}
                  options={subsectorSelectOptions}
                  disabled={
                    sectorsLoading ||
                    !selectedSectorId ||
                    subsectorSelectOptions.length === 0
                  }
                />
              </Box>

              {/* Row 4: Employee Count + Address */}
              <Box className="flex gap-6">
                <FormNumericField
                  name="employeesCount"
                  control={control}
                  label="Cantidad de trabajadores"
                  disabled={organizationSizesLoading}
                  min={0}
                  minMessage="La cantidad no puede ser negativa"
                />
                <FormTextField
                  name="address"
                  control={control}
                  label="Dirección / Región"
                />
              </Box>

              {/* Row 5: Main Activity */}
              <Box className="flex gap-6">
                <FormAutocompleteField
                  name="mainActivityId"
                  control={control}
                  label="Actividad principal del negocio"
                  labelId="activity-label"
                  options={activityOptions}
                  loading={activitiesLoading}
                  disabled={activitiesLoading || activityOptions.length === 0}
                  className="flex-1"
                />
                <Box className="flex-1" />
              </Box>
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
                label="Ingresa los datos del representante legal de tu organización"
                size="small"
              />
            </Box>

            <Box className="flex flex-col gap-4">
              {/* Row 1: Name + ID */}
              <Box className="flex gap-6">
                <FormTextField
                  name="representativeFullName"
                  control={control}
                  label="Nombre completo"
                  required
                />
                <FormTextField
                  name="representativeTaxId"
                  control={control}
                  label="ID representante"
                  required
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
                  required
                />
                <FormTextField
                  name="representativePhone"
                  control={control}
                  label="Teléfono"
                  required
                />
              </Box>

              {/* Row 3: Email */}
              <Box className="flex gap-6">
                <FormTextField
                  name="representativeEmail"
                  control={control}
                  label="Correo"
                  className="flex-1"
                  required
                />
                <Box className="flex-1" />
              </Box>
            </Box>
          </Box>
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
    </Dialog>
  );
};
