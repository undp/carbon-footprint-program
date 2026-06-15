import { FC } from "react";
import { Control, useWatch } from "react-hook-form";
import { alpha, Box, Typography } from "@mui/material";
import { WarningAmberRounded } from "@mui/icons-material";
import { FormFileUpload } from "@/components";
import { RequestVerificationFormValues } from "../RequestVerificationDialog";

interface FileUploadSectionProps {
  control: Control<RequestVerificationFormValues>;
  isLoading: boolean;
}

export const FileUploadSection: FC<FileUploadSectionProps> = ({
  control,
  isLoading,
}) => {
  const files = useWatch({ control, name: "files" });

  return (
    <Box className="flex flex-col gap-2">
      <Typography variant="subtitle1" fontWeight={600}>
        Carga de archivos para la postulación
      </Typography>
      {files.length === 0 && (
        <Box
          className="flex items-center gap-2 rounded-[10px] px-3 py-2"
          sx={(theme) => ({
            backgroundColor: alpha(theme.palette.warning.light, 0.1),
            border: `1px solid ${theme.palette.warning.light}`,
          })}
        >
          <WarningAmberRounded
            sx={(theme) => ({
              color: theme.palette.warning.dark,
              fontSize: 16,
            })}
          />
          <Typography
            variant="body2"
            sx={(theme) => ({ color: theme.palette.warning.dark })}
          >
            Debes adjuntar al menos un documento antes de enviar la postulación.
          </Typography>
        </Box>
      )}
      <FormFileUpload
        control={control}
        name="files"
        disabled={isLoading}
        required
        requiredMessage="Debes adjuntar al menos un documento antes de enviar la postulación."
      />
    </Box>
  );
};
