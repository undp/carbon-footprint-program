import { useMemo } from "react";

type NamedItem = { name?: string };

const BASE_LABELS = {
  nameLabel: "Nombre de la huella",
  yearLabel: "Año de la huella",
  companyNameLabel: "Nombre de la empresa (Opcional)",
  companySizeLabel: "Tamaño (Opcional)",
  sectorLabel: "Rubro",
  activityLabel: "Actividad principal del negocio (Opcional)",
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
