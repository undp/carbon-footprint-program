import { FC } from "react";
import { Box, Typography } from "@mui/material";
import { ReadOnlyField } from "@/components";

interface ApplicantIdentificationSectionProps {
  legalName?: string;
  taxId?: string | null;
  representativeFullName?: string | null;
  isLoading?: boolean;
}

export const ApplicantIdentificationSection: FC<
  ApplicantIdentificationSectionProps
> = ({ legalName, taxId, representativeFullName, isLoading }) => (
  <Box className="flex flex-col gap-4">
    <Typography variant="subtitle1" fontWeight={600}>
      Identificación del postulante
    </Typography>

    <ReadOnlyField
      label="Razón social"
      value={legalName}
      isLoading={isLoading}
    />
    <ReadOnlyField label="ID/Rut" value={taxId} isLoading={isLoading} />
    <ReadOnlyField
      label="Nombre del representante legal"
      value={representativeFullName}
      isLoading={isLoading}
    />
  </Box>
);
