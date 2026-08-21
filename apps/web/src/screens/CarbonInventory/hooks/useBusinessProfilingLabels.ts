import { useMemo } from "react";
import { VOCAB } from "@/config/vocab";

type NamedItem = { name?: string };

const BASE_LABELS = {
  nameLabel: "Nombre borrador huella",
  yearLabel: "Año de medición",
  companyNameLabel: `Nombre de ${VOCAB.organization.article.singular} (Opcional)`,
  companySizeLabel: "Tamaño (Opcional)",
  sectorLabel: "Sector",
  activityLabel: `Unidad de actividad de ${VOCAB.organization.article.singular} (Opcional)`,
  quantityLabel: "Cantidad de la unidad de actividad al año",
} as const;

export const useBusinessProfilingLabels = ({
  selectedSector,
  selectedActivity,
}: {
  selectedSector?: NamedItem;
  selectedActivity?: NamedItem;
}) => {
  const subSectorLabel = useMemo(
    () =>
      selectedSector ? "Actividad económica principal" : "Selecciona el sector",
    [selectedSector]
  );

  const quantityLabel = useMemo(
    () =>
      selectedActivity?.name
        ? `Cantidad de ${selectedActivity.name} al año`
        : "Selecciona la unidad de actividad",
    [selectedActivity]
  );

  return { ...BASE_LABELS, subSectorLabel, quantityLabel };
};
