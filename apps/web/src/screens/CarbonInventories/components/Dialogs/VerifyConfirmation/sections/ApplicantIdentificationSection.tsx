import { FC } from "react";
import { Box, TextField, Typography, useTheme } from "@mui/material";

interface ApplicantIdentificationSectionProps {
  legalName?: string;
  taxId?: string;
  representativeFullName?: string;
}

interface ReadOnlyFieldProps {
  label: string;
  value?: string;
}

const ReadOnlyField: FC<ReadOnlyFieldProps> = ({ label, value = "" }) => {
  const theme = useTheme();

  return (
    <Box>
      <Typography variant="body2" fontWeight={500} className="mb-1">
        {label}
      </Typography>
      <TextField
        sx={{
          padding: "4px 12px",
          borderRadius: "8px",
          backgroundColor: theme.palette.grey[200],
        }}
        variant="standard"
        disabled
        value={value}
        fullWidth
        size="small"
        slotProps={{
          input: {
            disableUnderline: true,
            sx: {
              fontSize: 14,
            },
          },
        }}
      />
    </Box>
  );
};

export const ApplicantIdentificationSection: FC<
  ApplicantIdentificationSectionProps
> = ({ legalName, taxId, representativeFullName }) => (
  <Box className="flex flex-col gap-4">
    <Typography variant="subtitle1" fontWeight={600}>
      Identificación del postulante
    </Typography>

    <ReadOnlyField label="Razón social" value={legalName} />
    <ReadOnlyField label="ID/Rut" value={taxId} />
    <ReadOnlyField
      label="Nombre del representante legal"
      value={representativeFullName}
    />
  </Box>
);
