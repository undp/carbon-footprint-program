import { FC } from "react";
import { Box, Stack, Typography, useTheme } from "@mui/material";
import { InfoRow } from "@/screens/MyOrganization/components/InfoRow";
import { GetSubmissionHistoryResponse } from "@repo/types";
import { VOCAB } from "@/config/vocab";

type Props = {
  data: GetSubmissionHistoryResponse[number]["organizationData"];
};

export const OrgDataSection: FC<Props> = ({ data }) => {
  const theme = useTheme();

  const cardSx = {
    bgcolor: theme.palette.background.default,
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: "4px",
    p: 2,
    display: "flex",
    flexDirection: "column",
    gap: 2,
  } as const;

  const sectionLabelSx = {
    fontWeight: 500,
    fontSize: 12,
    lineHeight: "16px",
    color: theme.palette.text.primary,
  } as const;

  return (
    <Stack spacing={1} sx={{ mt: 2 }}>
      {/* Perfil empresa */}
      <Typography sx={sectionLabelSx}>Perfil empresa</Typography>
      <Box sx={cardSx}>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 500,
            color: theme.palette.text.primary,
            fontSize: "0.75rem",
          }}
        >
          {data?.tradeName ?? data?.legalName}
        </Typography>
        <Box>
          <InfoRow label="RUT / Tax ID" value={data?.taxId ?? "-"} />
          <InfoRow label="Razón social" value={data?.legalName} />
          <InfoRow
            label="Rubro / Sector económico"
            value={data?.sector?.name ?? "-"}
          />
          <InfoRow label="Sub-rubro" value={data?.subsector?.name ?? "-"} />
          <InfoRow
            label={`Tamaño de ${VOCAB.organization.noun.singular}`}
            value={data?.countryOrganizationSize?.name ?? "-"}
          />
          <InfoRow
            label="Actividad principal"
            value={data?.mainActivity?.name ?? "-"}
          />
          <InfoRow label="Dirección" value={data?.address ?? "-"} />
          <InfoRow
            label="Número de trabajadores"
            value={data?.employeesCount ?? "-"}
          />
        </Box>
      </Box>

      {/* Representantes */}
      <Typography sx={sectionLabelSx}>Representantes</Typography>
      <Box sx={cardSx}>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 500,
            color: theme.palette.text.primary,
            fontSize: "0.75rem",
          }}
        >
          {data?.representative?.fullName}
        </Typography>
        <Box>
          <InfoRow
            label="ID representante / Rut"
            value={data?.representative?.taxId ?? "-"}
          />
          <InfoRow
            label="Cargo"
            value={data?.representative?.position?.name ?? "-"}
          />
          <InfoRow label="Correo" value={data?.representative?.email ?? "-"} />
          <InfoRow
            label="Teléfono"
            value={data?.representative?.phone ?? "-"}
          />
        </Box>
      </Box>
    </Stack>
  );
};
