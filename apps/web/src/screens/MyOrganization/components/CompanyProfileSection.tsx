import { FC } from "react";
import { Edit } from "@mui/icons-material";
import { SectionCard } from "./SectionCard";
import { InfoCard } from "./InfoCard";
import { InfoRow } from "./InfoRow";
import Typography from "@mui/material/Typography";

type Representative = {
  name: string;
  rut: string;
  position: string;
  email: string;
  phone: string;
};

type CompanyProfile = {
  name: string;
  rut: string;
  legalName: string;
  sector: string;
  subSector: string;
  size: string;
  mainActivity: string;
  address: string;
  region: string;
  employeeCount: number;
};

type CompanyProfileSectionProps = {
  profile: CompanyProfile;
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
        <InfoRow label="Rubro / Sector económico" value={profile.sector} />
        <InfoRow label="Sub-rubro" value={profile.subSector} />
        <InfoRow label="Tamaño de organización" value={profile.size} />
        <InfoRow label="Actividad principal" value={profile.mainActivity} />
        <InfoRow label="Dirección" value={profile.address} />
        <InfoRow label="Región" value={profile.region} />
        <InfoRow
          label="Número de trabajadores"
          value={profile.employeeCount.toString()}
        />
      </InfoCard>

      <Typography variant="h6" fontWeight={600}>
        Representante
      </Typography>
      <InfoCard title={representative.name}>
        <InfoRow label="ID representante / Rut" value={representative.rut} />
        <InfoRow label="Cargo" value={representative.position} />
        <InfoRow label="Correo" value={representative.email} />
        <InfoRow label="Teléfono" value={representative.phone} />
      </InfoCard>
    </SectionCard>
  );
};
