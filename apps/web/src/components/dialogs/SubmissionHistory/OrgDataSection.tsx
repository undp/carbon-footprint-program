import { FC } from "react";
import { Box, Stack, Typography, useTheme } from "@mui/material";
import { TAX_ID_LABEL } from "@repo/constants";
import { InfoRow } from "@/screens/MyOrganization/components/InfoRow";
import { GetSubmissionHistoryResponse } from "@repo/types";
import { VOCAB } from "@/config/vocab";
import { TERRITORY_LEVEL_LABELS } from "@/screens/MyOrganization/constants";
import { getTerritoryChain } from "@/screens/MyOrganization/mappers";

type Props = {
  data: GetSubmissionHistoryResponse[number]["organizationData"];
};

export const OrgDataSection: FC<Props> = ({ data }) => {
  const theme = useTheme();

  // Outermost first, the order the form asked for it. Only the levels the
  // organization actually answered are rendered: a reviewer reads what was
  // declared, not the shape of the hierarchy.
  const territoryChain = data ? getTerritoryChain(data) : [];

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
          <InfoRow label={TAX_ID_LABEL} value={data?.taxId ?? "-"} />
          <InfoRow label="Razón social" value={data?.legalName} />
          <InfoRow label="Sector" value={data?.sector?.name ?? "-"} />
          <InfoRow
            label="Actividad económica principal"
            value={data?.subsector?.name ?? "-"}
          />
          <InfoRow
            label="Actividad económica secundaria"
            value={data?.secondarySubsector?.name ?? "-"}
          />
          <InfoRow
            label={`Tamaño de ${VOCAB.organization.noun.singular}`}
            value={data?.countryOrganizationSize?.name ?? "-"}
          />
          <InfoRow
            label={`Unidad de actividad de ${VOCAB.organization.article.singular}`}
            value={data?.mainActivity?.name ?? "-"}
          />
          {territoryChain.map((node) => (
            <InfoRow
              key={node.id}
              label={TERRITORY_LEVEL_LABELS[node.level]}
              value={node.name}
            />
          ))}
          <InfoRow label="Dirección física" value={data?.address ?? "-"} />
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
            label="Documento de identidad del representante"
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
