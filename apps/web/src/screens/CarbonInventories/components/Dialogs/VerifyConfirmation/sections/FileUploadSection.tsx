import { FC } from "react";
import { Control, useWatch } from "react-hook-form";
import { alpha, Box, Typography } from "@mui/material";
import { WarningAmberRounded, FileUploadOutlined } from "@mui/icons-material";

import { FormFileUpload } from "@/components";
import { VerifyFormValues } from "../VerifyConfirmationDialog";

interface FileUploadSectionProps {
  control: Control<VerifyFormValues>;
  isLoading: boolean;
}

export const FileUploadSection: FC<FileUploadSectionProps> = ({
  control,
  isLoading,
}) => {
  const files = useWatch({ control, name: "files" });

  return (
    <>
      <Box className="flex flex-col gap-4">
        <Typography variant="subtitle1" fontWeight={600}>
          Carga de archivos para la postulación
        </Typography>

        <FormFileUpload
          control={control}
          name="files"
          disabled={isLoading}
          required
          requiredMessage="Debes adjuntar al menos un documento antes de enviar la postulación."
          maxSize={3 * 1024 * 1024}
          accept={{
            "image/png": [".png"],
            "image/jpeg": [".jpg", ".jpeg"],
            "application/pdf": [".pdf"],
            "application/vnd.ms-excel": [".xls"],
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
              [".xlsx"],
          }}
        >
          <Box className="flex cursor-pointer flex-col items-center gap-2 p-8">
            <FileUploadOutlined color="disabled" sx={{ fontSize: "40px" }} />
            <Typography variant="body2" fontWeight={500} color="text.primary">
              Adjuntar documentos
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <Typography
                component="span"
                variant="body2"
                fontWeight={500}
                sx={(theme) => ({ color: theme.palette.primary.main })}
              >
                Click para cargar
              </Typography>
              {" o arrastra y suelta los archivos"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              JPG, PNG, PDF, XLS (máx. 3MB por archivo)
            </Typography>
          </Box>
        </FormFileUpload>
      </Box>

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
    </>
  );
};
