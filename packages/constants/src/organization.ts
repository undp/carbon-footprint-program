/**
 * Label for `OrganizationData.taxId`. The platform is a Latin-America-wide
 * public good and the column holds a generic tax identifier (RUT in Chile, RUC
 * in Perú/Paraguay, RFC in México, …), so the wording is a per-deployment
 * constant instead of a literal repeated across screens and API copy.
 */
export const TAX_ID_LABEL = "RUT / RUC / ID Tributario";

/**
 * Compact form of {@link TAX_ID_LABEL} for tight surfaces: grid headers, chips
 * and one-line summaries where the full label does not fit.
 */
export const TAX_ID_LABEL_SHORT = "RUT";
