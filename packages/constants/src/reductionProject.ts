export const REDUCTION_PROJECT_DESCRIPTION_MAX_LENGTH = 5000;

// Deleting any entries from this list could potentially break the application.
// This list is used to type and parse the considered gei from the database.
// if you need to delete an entry, you must first delete or modify the related data from the database.
export const REDUCTION_PROJECT_CONSIDERED_GEI = [
  "CO2",
  "CH4",
  "HFC",
  "PFC",
  "SF6",
  "NF3",
];

// Deleting any entries from this list could potentially break the application.
// This list is used to type and parse the gwp source from the database.
// if you need to delete an entry, you must first delete or modify the related data from the database.
export const REDUCTION_PROJECT_GWP_OPTIONS = [
  "IPCC_AR4",
  "IPCC_AR5",
  "IPCC_AR6",
];

export const REDUCTION_PROJECT_REQUIRED_DOCUMENTS = [
  {
    title: "Informe del Proyecto de Reducción",
    description:
      "Documento que detalla la metodología, escenarios de línea base y proyecto, y resultados de la reducción de emisiones",
  },
  {
    title: "Informe de Verificación por Tercera Parte",
    description:
      "Informe emitido por un organismo verificador, con declaración de verificación firmada",
  },
  {
    title: "Declaración jurada de No Conflicto de Interés",
    description:
      "Checkbox de la plataforma y/o documento firmado por el representante legal",
  },
];
