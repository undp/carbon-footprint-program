export const ExplanationSlug = {
  REDUCTION_PROJECTS_LIST: "reduction_projects_list",
  REDUCTION_PROJECT_BASIS: "reduction_project_basis",
  REDUCTION_PROJECT_GWP: "reduction_project_gwp",
  REDUCTION_PROJECT_GEI_CONSIDERED: "reduction_project_gei_considered",
  REDUCTION_PROJECT_REPORTED_ELSEWHERE: "reduction_project_reported_elsewhere",
} as const;

export type ExplanationSlug =
  (typeof ExplanationSlug)[keyof typeof ExplanationSlug];

export interface ExplanationCatalogEntry {
  name: string;
  description?: string;
}

export const EXPLANATION_CATALOG: Record<
  ExplanationSlug,
  ExplanationCatalogEntry
> = {
  [ExplanationSlug.REDUCTION_PROJECTS_LIST]: {
    name: "Listado de proyectos de reducción",
    description:
      "Texto de ayuda mostrado en el encabezado del listado de proyectos de reducción.",
  },
  [ExplanationSlug.REDUCTION_PROJECT_BASIS]: {
    name: "Datos base del proyecto de reducción",
    description:
      "Explicación de la sección 'Datos base' al crear o editar un proyecto de reducción.",
  },
  [ExplanationSlug.REDUCTION_PROJECT_GWP]: {
    name: "GWP (Potencial de Calentamiento Global)",
    description:
      "Explicación del campo GWP utilizado para convertir GEI a CO₂ equivalente.",
  },
  [ExplanationSlug.REDUCTION_PROJECT_GEI_CONSIDERED]: {
    name: "GEI considerados",
    description:
      "Explicación de los gases de efecto invernadero considerados en el proyecto.",
  },
  [ExplanationSlug.REDUCTION_PROJECT_REPORTED_ELSEWHERE]: {
    name: "Reportado en otra iniciativa",
    description:
      "Explicación del campo que indica si el proyecto se reporta en otra iniciativa.",
  },
};
