import { CollisionState, SubmissionStatus } from "@repo/types";
import { VOCAB } from "@/config/vocab";
import { StatusConfig } from "./types";
import {
  ADMIN_ORGANIZATION_STATUS_CONFIG,
  AdminOrganizationDisplayStatus,
} from "./organization";
import { SUBMISSION_STATUS_CONFIG } from "./submission";

/**
 * A collision chip states what the OTHER organization is, so it must read like
 * that state reads everywhere else in the app — the alert belongs to the
 * surrounding "Conflictos detectados" panel, not to the chip. Family and label
 * are therefore taken from the canonical configs (an inscribed organization, a
 * pending submission) instead of being re-picked here; only the tooltip is
 * collision-specific.
 */
const INSCRIBED_ORGANIZATION =
  ADMIN_ORGANIZATION_STATUS_CONFIG[AdminOrganizationDisplayStatus.ACCREDITED];
const PENDING_SUBMISSION = SUBMISSION_STATUS_CONFIG[SubmissionStatus.PENDING];

/**
 * Chip config for an identity-collision state in the accreditation review
 * dialog: `APPROVED` = the applicant collides with an already-inscribed
 * organization (compared against its approved snapshot), `PENDING` = it collides
 * with another postulation still under review.
 */
export const COLLISION_STATE_CONFIG = {
  APPROVED: {
    family: INSCRIBED_ORGANIZATION.family,
    label: INSCRIBED_ORGANIZATION.label,
    tooltip: `Coincide con una ${VOCAB.organization.noun.singular} ya ${VOCAB.inscription.adjective.singular}, comparada contra sus datos aprobados`,
  },
  PENDING: {
    family: PENDING_SUBMISSION.family,
    label: PENDING_SUBMISSION.label,
    tooltip: "Coincide con otra postulación pendiente de revisión",
  },
} satisfies Record<CollisionState, StatusConfig>;
