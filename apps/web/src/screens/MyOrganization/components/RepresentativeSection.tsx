import { FC } from "react";
import { SectionCard } from "./SectionCard";
import { InfoCard } from "./InfoCard";
import { InfoRow } from "./InfoRow";

type Representative = {
  name: string;
  rut: string;
  position: string;
  email: string;
  phone: string;
};

type RepresentativeSectionProps = {
  representative: Representative;
  onEdit: () => void;
};

export const RepresentativeSection: FC<RepresentativeSectionProps> = ({
  representative,
  onEdit,
}) => {
  return (
    <SectionCard title="Representante">
      <InfoCard title={representative.name} onEdit={onEdit}>
        <InfoRow label="ID representante / Rut" value={representative.rut} />
        <InfoRow label="Cargo" value={representative.position} />
        <InfoRow label="Correo" value={representative.email} />
        <InfoRow label="Teléfono" value={representative.phone} />
      </InfoCard>
    </SectionCard>
  );
};
