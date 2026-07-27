import { capitalize } from "lodash-es";
import { CollisionState } from "@repo/types";
import { VOCAB } from "@/config/vocab";
import { StatusConfig, StatusFamily } from "./types";

/**
 * Chip config for an identity-collision state in the accreditation review
 * dialog: `APPROVED` = the applicant collides with an already-inscribed
 * organization (compared against its approved snapshot), `PENDING` = it collides
 * with another postulation still under review.
 */
export const COLLISION_STATE_CONFIG = {
  APPROVED: {
    family: StatusFamily.ACTION_REQUIRED,
    label: capitalize(VOCAB.inscription.adjective.singular),
    tooltip: `Coincide con una ${VOCAB.organization.noun.singular} ya ${VOCAB.inscription.adjective.singular}, comparada contra sus datos aprobados`,
  },
  PENDING: {
    family: StatusFamily.IN_REVIEW,
    label: "Pendiente",
    tooltip: "Coincide con otra postulación pendiente de revisión",
  },
} satisfies Record<CollisionState, StatusConfig>;
