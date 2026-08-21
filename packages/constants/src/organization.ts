/**
 * Label for `OrganizationData.taxId`. The column holds a generic tax
 * identifier (RNC in República Dominicana, RUT in Chile, RUC in Perú/Paraguay,
 * RFC in México, …), so the wording is a per-deployment constant instead of a
 * literal repeated across screens and API copy. This deployment is Dominican.
 */
export const TAX_ID_LABEL = "RNC (Registro Nacional de Contribuyentes)";

/**
 * Compact form of {@link TAX_ID_LABEL} for tight surfaces: grid headers, chips
 * and one-line summaries where the full label does not fit.
 */
export const TAX_ID_LABEL_SHORT = "RNC";

/**
 * Documents that evidence an organization's identity and its representative's
 * authority when requesting inscription. Split in two categories because they
 * are not equally demanded: the base document is always required, while the
 * conditional ones depend on how the organization is constituted. Which
 * documents carry legal validity is per-deployment; these are the Dominican
 * ones.
 */
export const INSCRIPTION_BASE_DOCUMENTS = [
  {
    title: "Acta de inscripción en el RNC o certificación vigente de la DGII",
    description:
      "Acredita la identidad tributaria de la organización ante la Dirección General de Impuestos Internos",
  },
];

export const INSCRIPTION_CONDITIONAL_DOCUMENTS = [
  {
    title: "Registro Mercantil vigente",
    description:
      "Exigible a las organizaciones con obligación de registro mercantil ante la Cámara de Comercio y Producción",
  },
  {
    title: "Documento que acredite la representación legal",
    description:
      "Acta de asamblea, poder notarial o equivalente que faculte a la persona representante a actuar por la organización",
  },
];
