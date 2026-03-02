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
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { useOrganizationData } from "@/hooks";
import { DevTool } from "@hookform/devtools";
import { IS_DEVELOPMENT } from "../../../../config/environment";
import { GetOrganizationByIdResponse } from "@repo/types";
import { OrganizationFormFields } from "./OrganizationFormFields";
import { OrganizationRepresentativeFields } from "./OrganizationRepresentativeFields";
import {
  useOrganizationFormDialogData,
  useOrganizationFormDialogForm,
} from "./hooks";

type DialogMode = "create" | "edit" | "accreditation";

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
  const { defaultValues } = useOrganizationFormDialogData({ organization });

  const { form, onSubmit, isSubmitting } = useOrganizationFormDialogForm({
    initialValues: defaultValues,
    mode,
    organizationId: organization?.id,
    onSuccess: onClose,
  });

  const { control, handleSubmit, reset, watch } = form;

  // Watch the selected sector to filter subsectors
  const selectedSectorId = watch("sectorId");

  // Fetch organization data from API
  const {
    sectorOptions,
    subsectorSelectOptions,
    companySizeOptions,
    sectorsLoading,
    organizationSizesLoading,
    activityOptions,
    activitiesLoading,
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

      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent
          sx={{ pt: 0, overflow: "auto", maxHeight: "calc(90vh - 160px)" }}
        >
          <OrganizationFormFields
            control={control}
            sectorOptions={sectorOptions}
            subsectorSelectOptions={subsectorSelectOptions}
            companySizeOptions={companySizeOptions}
            activityOptions={activityOptions}
            sectorsLoading={sectorsLoading}
            organizationSizesLoading={organizationSizesLoading}
            activitiesLoading={activitiesLoading}
            selectedSectorId={selectedSectorId || undefined}
          />

          <Divider sx={{ mb: 3, opacity: 0.2 }} />

          <OrganizationRepresentativeFields control={control} />
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
