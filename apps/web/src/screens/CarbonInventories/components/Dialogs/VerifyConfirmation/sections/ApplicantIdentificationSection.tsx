import { FC } from "react";
import { Box, Typography } from "@mui/material";
import { ReadOnlyField } from "@/components";

interface ApplicantIdentificationSectionProps {
  legalName?: string;
  taxId?: string;
  representativeFullName?: string;
}

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
