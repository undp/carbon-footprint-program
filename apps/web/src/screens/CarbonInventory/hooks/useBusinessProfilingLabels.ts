import { useMemo } from "react";
import { VOCAB } from "@/config/vocab";

type NamedItem = { name?: string };

const BASE_LABELS = {
  nameLabel: "Nombre de la huella",
  yearLabel: "Año de la huella",
  companyNameLabel: `Nombre de ${VOCAB.organization.article.singular} (Opcional)`,
  companySizeLabel: "Tamaño (Opcional)",
  sectorLabel: "Rubro",
  activityLabel: `Actividad principal de ${VOCAB.organization.article.singular} (Opcional)`,
  quantityLabel: "Cantidad de actividad principal al año",
} as const;

export const useBusinessProfilingLabels = ({
  selectedSector,
  selectedActivity,
}: {
  selectedSector?: NamedItem;
  selectedActivity?: NamedItem;
}) => {
  const subSectorLabel = useMemo(
    () => (selectedSector ? "Sub-rubro" : "Selecciona el rubro"),
    [selectedSector]
  );

  const quantityLabel = useMemo(
    () =>
      selectedActivity?.name
        ? `Cantidad de ${selectedActivity.name} al año`
        : "Selecciona la actividad principal",
    [selectedActivity]
  );

  return { ...BASE_LABELS, subSectorLabel, quantityLabel };
};
