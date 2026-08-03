import { TAX_ID_LABEL_SHORT } from "@repo/constants";
import {
  OrganizationDisplayStatusValues,
  type CollisionField,
  type OrganizationDisplayStatus,
  type OrganizationIdentityCollisionMetadata,
} from "@repo/types";
import { VOCAB } from "@/config/vocab";

/**
 * Spanish copy for an identity-collision warning. The API sends structure only
 * ({@link OrganizationIdentityCollisionMetadata}) and the sentence is composed
 * here, so the vocabulary comes from `VOCAB` — the server has no access to it,
 * and duplicating "organización" / "inscrita" there would let the two drift the
 * day we change a term.
 */

/**
 * The three identity fields in prose form, lowercase because that is how they
 * read inside a sentence. The comparison grid capitalizes them for its labels,
 * so this stays the single source for both surfaces.
 */
export const COLLISION_FIELD_LABELS: Record<CollisionField, string> = {
  legalName: "razón social",
  tradeName: "nombre comercial",
  taxId: TAX_ID_LABEL_SHORT,
};

/** Joins field labels with commas and a final "y" (e.g. "razón social y RUT"). */
const joinFieldLabels = (fields: CollisionField[]): string => {
  const labels = fields.map((field) => COLLISION_FIELD_LABELS[field]);
  if (labels.length <= 1) return labels.join("");
  return `${labels.slice(0, -1).join(", ")} y ${labels[labels.length - 1]}`;
};

/**
 * How each organization standing reads inside the sentence, as a function of the
 * identity shown in parentheses. Exhaustive over `OrganizationDisplayStatus` so a
 * fourth standing cannot be silently phrased as one of these.
 */
const ORGANIZATION_CLAUSES: Record<
  OrganizationDisplayStatus,
  (identity: string) => string
> = {
  [OrganizationDisplayStatusValues.ACCREDITED]: (identity) =>
    `${VOCAB.organization.article.singular} ${VOCAB.inscription.adjective.singular} (${identity})`,
  [OrganizationDisplayStatusValues.NOT_ACCREDITED]: (identity) =>
    `una ${VOCAB.organization.noun.singular} no ${VOCAB.inscription.adjective.singular} (${identity})`,
  [OrganizationDisplayStatusValues.BLOCKED]: (identity) =>
    `una ${VOCAB.organization.noun.singular} bloqueada (${identity})`,
};

/**
 * One-line summary of a collision (design D9): names the conflicting POSTULATION
 * and then the organization behind it, listing the colliding fields in the order
 * the API sent them (the API owns that ordering).
 *
 * The organization clause branches on `organizationStatus`, never on the
 * collision state — a pending collision usually comes from an organization that
 * is not inscribed yet, and a collision against an approved snapshot may well
 * belong to a blocked organization; either would be false. The identity in
 * parentheses falls back to the legal name when there is no tax id.
 */
export const buildCollisionMessage = (
  metadata: OrganizationIdentityCollisionMetadata
): string => {
  const campos = joinFieldLabels(metadata.collisionFields);
  const identidad =
    metadata.taxId !== null
      ? `${TAX_ID_LABEL_SHORT} ${metadata.taxId}`
      : `«${metadata.legalName}»`;
  const postulacion =
    metadata.collisionState === "APPROVED"
      ? "la postulación aprobada"
      : "la postulación pendiente";
  const organizacion =
    ORGANIZATION_CLAUSES[metadata.organizationStatus](identidad);

  return `Coincide con ${postulacion} de ${organizacion} en ${campos}.`;
};
