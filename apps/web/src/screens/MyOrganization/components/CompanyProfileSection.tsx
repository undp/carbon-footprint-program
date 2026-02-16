import { FC } from "react";
import { Edit } from "@mui/icons-material";
import { SectionCard } from "./SectionCard";
import { InfoCard } from "./InfoCard";
import { InfoRow } from "./InfoRow";
import Typography from "@mui/material/Typography";
import { GetOrganizationResponse, Representative } from "../../../api/query";

type CompanyProfileSectionProps = {
  profile: GetOrganizationResponse;
  representative: Representative;
  onEdit: () => void;
};

export const CompanyProfileSection: FC<CompanyProfileSectionProps> = ({
  profile,
  representative,
  onEdit,
}) => {
  return (
    <SectionCard
      title="Perfil empresa"
      action={{
        label: "EDITAR",
        icon: <Edit />,
        onClick: onEdit,
      }}
    >
      <InfoCard title={profile.name}>
        <InfoRow label="RUT / RUC" value={profile.rut} />
        <InfoRow label="Razón social" value={profile.legalName} />
        <InfoRow label="Rubro / Sector económico" value={profile.sector.name} />
        <InfoRow label="Sub-rubro" value={profile.subsector.name} />
        <InfoRow
          label="Tamaño de organización"
          value={profile.countryOrganizationSize.name}
        />
        <InfoRow
          label="Actividad principal"
          value={profile.mainActivity.name}
        />
        <InfoRow label="Dirección" value={profile.address} />
        <InfoRow
          label="Número de trabajadores"
          value={profile.employeeCount.toString()}
        />
      </InfoCard>

      <Typography variant="h6" fontWeight={600}>
        Representante
      </Typography>
      <InfoCard title={representative.name}>
        <InfoRow label="ID representante / Rut" value={representative.taxId} />
        <InfoRow label="Cargo" value={representative.position.name} />
        <InfoRow label="Correo" value={representative.email} />
        <InfoRow label="Teléfono" value={representative.phone} />
      </InfoCard>
    </SectionCard>
  );
};
