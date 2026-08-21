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
