import { FC } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Button,
  IconButton,
  Typography,
  Divider,
  Tooltip,
} from "@mui/material";
import { Close, InfoOutlined } from "@mui/icons-material";
import { useForm } from "react-hook-form";
import { FormTextField, FormSelectField } from "@/components";
import { useOrganizationData } from "@/hooks";

export type CompanyAccreditationFormData = {
  // Organization data
  legalName: string;
  commercialName: string;
  taxId: string;
  organizationType: string;
  economicSector: string;
  subSector: string;
  employeeCount: string;
  address: string;
  // Representative data
  representativeName: string;
  representativeId: string;
  representativePosition: string;
  representativePhone: string;
};

type DialogMode = "create" | "edit" | "accreditation";

interface CompanyAccreditationDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CompanyAccreditationFormData) => void;
  mode?: DialogMode;
  initialData?: Partial<CompanyAccreditationFormData>;
  isSubmitting?: boolean;
}

const DIALOG_TITLES: Record<DialogMode, string> = {
  create: "Crear perfil de empresa",
  edit: "Editar perfil de empresa",
  accreditation: "Acreditación de la empresa",
};

export const CompanyAccreditationDialog: FC<
  CompanyAccreditationDialogProps
> = ({
  open,
  onClose,
  onSubmit,
  mode = "accreditation",
  initialData,
  isSubmitting = false,
}) => {
  const { control, handleSubmit, reset, watch } =
    useForm<CompanyAccreditationFormData>({
      defaultValues: {
        legalName: initialData?.legalName ?? "",
        commercialName: initialData?.commercialName ?? "",
        taxId: initialData?.taxId ?? "",
        organizationType: initialData?.organizationType ?? "",
        economicSector: initialData?.economicSector ?? "",
        subSector: initialData?.subSector ?? "",
        employeeCount: initialData?.employeeCount ?? "",
        address: initialData?.address ?? "",
        representativeName: initialData?.representativeName ?? "",
        representativeId: initialData?.representativeId ?? "",
        representativePosition: initialData?.representativePosition ?? "",
        representativePhone: initialData?.representativePhone ?? "",
      },
    });

  // Watch the selected sector to filter subsectors
  const selectedSectorId = watch("economicSector");

  // Fetch organization data from API
  const {
    sectorOptions,
    subsectorSelectOptions,
    companySizeOptions,
    sectorsLoading,
    organizationSizesLoading,
  } = useOrganizationData({
    selectedSectorId,
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFormSubmit = (data: CompanyAccreditationFormData) => {
    onSubmit(data);
  };

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

      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent
          sx={{ pt: 0, overflow: "auto", maxHeight: "calc(90vh - 160px)" }}
        >
          {/* Organization Data Section */}
          <Box className="mb-6">
            <Box className="mb-4 flex items-center gap-2">
              <Typography variant="body1" fontSize={18}>
                Ingreso de datos de la organización
              </Typography>
              <Tooltip title="Ingresa los datos de tu organización para la acreditación">
                <InfoOutlined fontSize="small" color="action" />
              </Tooltip>
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
                  name="commercialName"
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
                  name="organizationType"
                  control={control}
                  label="Tipo / Tamaño organización"
                  options={companySizeOptions}
                  disabled={organizationSizesLoading}
                />
              </Box>

              {/* Row 3: Economic Sector + Sub-sector */}
              <Box className="flex gap-6">
                <FormSelectField
                  name="economicSector"
                  control={control}
                  label="Rubro / Sector económico"
                  options={sectorOptions}
                  disabled={sectorsLoading}
                />
                <FormSelectField
                  name="subSector"
                  control={control}
                  label="Sub-rubro"
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
                <FormSelectField
                  name="employeeCount"
                  control={control}
                  label="Cantidad de trabajadores"
                  options={companySizeOptions}
                  disabled={organizationSizesLoading}
                />
                <FormTextField
                  name="address"
                  control={control}
                  label="Dirección / Región"
                />
              </Box>
            </Box>
          </Box>

          <Divider sx={{ mb: 3, opacity: 0.2 }} />

          {/* Representative Data Section */}
          <Box>
            <Box className="mb-4 flex items-center gap-2">
              <Typography variant="body1" fontSize={18}>
                Ingreso de datos del representante legal o responsable
                institucional
              </Typography>
              <Tooltip title="Ingresa los datos del representante legal de tu organización">
                <InfoOutlined fontSize="small" color="action" />
              </Tooltip>
            </Box>

            <Box className="flex flex-col gap-4">
              {/* Row 1: Name + ID */}
              <Box className="flex gap-6">
                <FormTextField
                  name="representativeName"
                  control={control}
                  label="Nombre completo"
                  required
                />
                <FormTextField
                  name="representativeId"
                  control={control}
                  label="ID representante"
                  required
                />
              </Box>

              {/* Row 2: Position + Phone */}
              <Box className="flex gap-6">
                <FormTextField
                  name="representativePosition"
                  control={control}
                  label="Cargo"
                />
                <FormTextField
                  name="representativePhone"
                  control={control}
                  label="Teléfono"
                />
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
          >
            {isSubmitting ? "Enviando..." : "ENVIAR"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
