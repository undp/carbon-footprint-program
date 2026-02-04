import { FC } from "react";
import { Add } from "@mui/icons-material";
import { SectionCard } from "./SectionCard";
import { InfoCard } from "./InfoCard";
import { InfoRow } from "./InfoRow";

type Branch = {
  id: string;
  name: string;
  region: string;
  type: string;
};

type BranchesSectionProps = {
  branches: Branch[];
  onAdd: () => void;
  onEdit: (id: string) => void;
};

export const BranchesSection: FC<BranchesSectionProps> = ({
  branches,
  onAdd,
  onEdit,
}) => {
  return (
    <SectionCard
      title="Sedes/sucursales/establecimientos"
      action={{
        label: "AGREGAR NUEVA",
        icon: <Add />,
        onClick: onAdd,
      }}
    >
      {branches.map((branch) => (
        <InfoCard
          key={branch.id}
          title={branch.name}
          onEdit={() => onEdit(branch.id)}
        >
          <InfoRow label="Región" value={branch.region} />
          <InfoRow label="Tipo" value={branch.type} />
        </InfoCard>
      ))}
    </SectionCard>
  );
};
