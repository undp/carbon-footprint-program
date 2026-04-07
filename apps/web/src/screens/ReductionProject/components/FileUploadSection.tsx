import { FC } from "react";
import { Box, Divider, Typography } from "@mui/material";
import { Control } from "react-hook-form";
import { FormFileUpload } from "@/components/form";
import type { ReductionProjectFormValues } from "../types";

interface Props {
  control: Control<ReductionProjectFormValues>;
  disabled: boolean;
}

export const FileUploadSection: FC<Props> = ({ control, disabled }) => {
  return (
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
        disabled={disabled}
        required
        requiredMessage="Al menos un archivo es requerido"
      />
    </>
  );
};
