import { FC, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
} from "@mui/material";
import { Close } from "@mui/icons-material";

import { useOrganization } from "@/api/query";
import {
  RequiredDocumentsSection,
  PrerequisitesSection,
  ApplicantIdentificationSection,
  FileUploadSection,
  SwornDeclarationSection,
} from "./sections";
import {
  REDUCTION_PROJECT_VERIFICATION_DIALOG_TITLE,
  REDUCTION_PROJECT_VERIFICATION_SUBMIT_LABEL,
} from "../../../constants";

export interface RequestVerificationFormValues {
  files: File[];
  sworn: boolean;
}

interface RequestVerificationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (files: File[]) => void | Promise<void>;
  isLoading: boolean;
  organizationId: string | null;
}

export const RequestVerificationDialog: FC<RequestVerificationDialogProps> = ({
  open,
  onClose,
  onConfirm,
  isLoading,
  organizationId,
}) => {
  const { control, handleSubmit, reset } =
    useForm<RequestVerificationFormValues>({
      defaultValues: { files: [], sworn: false },
    });

  const { data: organization, isLoading: isOrganizationLoading } =
    useOrganization(organizationId ?? undefined);

  const onSubmit = useCallback(
    async (data: RequestVerificationFormValues) => {
      await onConfirm(data.files);
    },
    [onConfirm]
  );

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  return (
    <Dialog
      open={open}
      onClose={isLoading ? undefined : onClose}
      maxWidth="md"
      fullWidth
      aria-labelledby="rp-verify-dialog-title"
      slotProps={{
        paper: { sx: { borderRadius: 1 } },
      }}
    >
      <DialogTitle id="rp-verify-dialog-title" sx={{ pr: 6, fontWeight: 600 }}>
        {REDUCTION_PROJECT_VERIFICATION_DIALOG_TITLE}
      </DialogTitle>

      <IconButton
        aria-label="cerrar"
        onClick={onClose}
        disabled={isLoading}
        sx={(theme) => ({
          position: "absolute",
          right: 16,
          top: 16,
          color: theme.palette.grey[500],
        })}
      >
        <Close />
      </IconButton>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent className="flex flex-col gap-5 pt-0">
          <RequiredDocumentsSection />
          <Divider />
          <PrerequisitesSection />
          <Divider />
          <ApplicantIdentificationSection
            legalName={organization?.legalName}
            taxId={organization?.taxId}
            representativeFullName={organization?.representative?.fullName}
            isLoading={isOrganizationLoading}
          />
          <Divider />
          <FileUploadSection control={control} isLoading={isLoading} />
          <SwornDeclarationSection control={control} isLoading={isLoading} />
        </DialogContent>

        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: 1,
            borderColor: "divider",
          }}
        >
          <Button onClick={onClose} disabled={isLoading} color="inherit">
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            loading={isLoading}
          >
            {REDUCTION_PROJECT_VERIFICATION_SUBMIT_LABEL}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
