import { FC } from "react";
import { Box, Typography, Divider } from "@mui/material";
import { OrganizationInfo } from "../types";

type OrganizationInfoSectionProps = {
  organizationInfo: OrganizationInfo;
};

const infoRowFields: { key: keyof OrganizationInfo; label: string }[] = [
  { key: "legalName", label: "Razón social" },
  { key: "rut", label: "RUT/RUC" },
  { key: "legalRepresentative", label: "Nombre del representante legal" },
];

export const OrganizationInfoSection: FC<OrganizationInfoSectionProps> = ({
  organizationInfo,
}) => {
  return (
    <Box className="flex flex-col gap-4">
      {infoRowFields.map(({ key, label }) => (
        <Box
          key={key}
          className="flex gap-4 rounded p-4 text-base"
          sx={{ bgcolor: "action.hover" }}
        >
          <Typography sx={{ fontWeight: 600, width: 240 }}>{label}</Typography>
          <Typography>{organizationInfo[key]}</Typography>
        </Box>
      ))}
      <Divider sx={{ opacity: 0.2 }} />
    </Box>
  );
};
