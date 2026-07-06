import {
  CarbonInventoryDisplayStatus,
  CarbonInventoryDisplayStatusEnum as Status,
  GetCarbonInventoriesMinimalResponse,
} from "@repo/types";
import { StatusFamily } from "@/labels/chips/types";
import { CARBON_INVENTORY_STATUS_CONFIG } from "@/labels/chips/carbonInventory";

export type HuellaItem = GetCarbonInventoriesMinimalResponse[number];

/**
 * A huella "fills" the home dashboard only once its measurement (or
 * verification) recognition is approved. Every other state — no huella yet,
 * draft, in review, with observations, rejected — falls back to the guided
 * welcome home, on every login, until this becomes true.
 */
export const isDashboardReady = (status: CarbonInventoryDisplayStatus) =>
  status === Status.CALCULATION_APPROVED ||
  status === Status.VERIFICATION_APPROVED;

// Rank families so the huella that most needs the user's attention is the one
// surfaced on the welcome home when several are in progress.
const FAMILY_URGENCY: Record<StatusFamily, number> = {
  [StatusFamily.ACTION_REQUIRED]: 3,
  [StatusFamily.NEGATIVE]: 2,
  [StatusFamily.IN_REVIEW]: 1,
  [StatusFamily.NEUTRAL]: 0,
  [StatusFamily.POSITIVE]: 0,
};

/**
 * Picks the in-progress huella to feature: most urgent first (observations /
 * rejected / in review), breaking ties by most recent year.
 */
export const selectPrimaryHuella = (
  inventories: GetCarbonInventoriesMinimalResponse
): HuellaItem | null => {
  const sorted = [...inventories].sort((a, b) => {
    const urgencyA =
      FAMILY_URGENCY[CARBON_INVENTORY_STATUS_CONFIG[a.status].family];
    const urgencyB =
      FAMILY_URGENCY[CARBON_INVENTORY_STATUS_CONFIG[b.status].family];
    if (urgencyA !== urgencyB) return urgencyB - urgencyA;
    return (b.year ?? 0) - (a.year ?? 0);
  });
  return sorted[0] ?? null;
};

export interface HuellaTreatment {
  /** Hero eyebrow (kicker) above the greeting. */
  eyebrow: string;
  /** Hero subtitle: a warm, high-level line about where the huella stands. */
  heroSubtitle: string;
  /** Short label shown next to the hero progress bar. */
  progressLabel: string;
  /** Contextual line under the "Mide tu huella" step. */
  stepMessage: string;
  /** Label for the step's action button. */
  ctaLabel: string;
  /** Whether the CTA is the primary action (contained) or secondary (outlined). */
  emphasize: boolean;
}

const REVIEW: Pick<
  HuellaTreatment,
  "eyebrow" | "heroSubtitle" | "ctaLabel" | "emphasize"
> = {
  eyebrow: "Vas muy bien",
  heroSubtitle:
    "Tu huella está en revisión. En cuanto el equipo tenga novedades, lo verás aquí.",
  ctaLabel: "Ver huella",
  emphasize: false,
};

const OBSERVATIONS: Pick<
  HuellaTreatment,
  "eyebrow" | "heroSubtitle" | "ctaLabel" | "emphasize"
> = {
  eyebrow: "Necesita tu atención",
  heroSubtitle:
    "Tu huella tiene observaciones que resolver antes de aprobarse.",
  ctaLabel: "Revisar observaciones",
  emphasize: true,
};

const REJECTED: Pick<
  HuellaTreatment,
  "eyebrow" | "heroSubtitle" | "ctaLabel" | "emphasize"
> = {
  eyebrow: "Necesita tu atención",
  heroSubtitle:
    "Tu última solicitud fue rechazada, pero puedes revisarla y volver a intentarlo.",
  ctaLabel: "Ver detalles",
  emphasize: true,
};

const HUELLA_TREATMENT: Partial<
  Record<CarbonInventoryDisplayStatus, HuellaTreatment>
> = {
  [Status.DRAFT]: {
    eyebrow: "Qué bueno verte de nuevo",
    heroSubtitle: "Ya tienes una huella en marcha. Retómala cuando quieras.",
    progressLabel: "En borrador",
    stepMessage:
      "Tienes una huella en borrador. Complétala para avanzar al reconocimiento de medición.",
    ctaLabel: "Continuar huella",
    emphasize: true,
  },
  [Status.SELF_DECLARED]: {
    eyebrow: "Qué bueno verte de nuevo",
    heroSubtitle:
      "Tu huella está autodeclarada. Envíala a reconocimiento cuando estés listo.",
    progressLabel: "Autodeclarada",
    stepMessage:
      "Tu huella está autodeclarada. Envíala a reconocimiento de medición para validarla.",
    ctaLabel: "Ver huella",
    emphasize: true,
  },
  [Status.SUBMITTED_TO_CALCULATION]: {
    ...REVIEW,
    progressLabel: "En revisión",
    stepMessage:
      "Enviaste tu huella a reconocimiento de medición. Te avisaremos apenas haya novedades.",
  },
  [Status.SUBMITTED_TO_VERIFICATION]: {
    ...REVIEW,
    progressLabel: "En revisión",
    stepMessage:
      "Enviaste tu huella a reconocimiento de verificación. Te avisaremos apenas haya novedades.",
  },
  [Status.CALCULATION_REVIEWED]: {
    ...OBSERVATIONS,
    progressLabel: "Acción requerida",
    stepMessage:
      "El equipo dejó observaciones en tu medición. Resuélvelas para continuar.",
  },
  [Status.VERIFICATION_REVIEWED]: {
    ...OBSERVATIONS,
    progressLabel: "Acción requerida",
    stepMessage:
      "El equipo dejó observaciones en tu verificación. Resuélvelas para continuar.",
  },
  [Status.CALCULATION_REJECTED]: {
    ...REJECTED,
    progressLabel: "Rechazada",
    stepMessage:
      "Tu solicitud de medición fue rechazada. Revisa los detalles y vuelve a intentarlo.",
  },
  [Status.VERIFICATION_REJECTED]: {
    ...REJECTED,
    progressLabel: "Rechazada",
    stepMessage:
      "Tu solicitud de verificación fue rechazada. Revisa los detalles y vuelve a intentarlo.",
  },
};

const DEFAULT_TREATMENT: HuellaTreatment = {
  eyebrow: "Qué bueno verte de nuevo",
  heroSubtitle: "Ya tienes una huella en marcha. Aquí puedes seguir su avance.",
  progressLabel: "En progreso",
  stepMessage: "Continúa con tu huella de carbono.",
  ctaLabel: "Ver huella",
  emphasize: false,
};

export const getHuellaTreatment = (
  status: CarbonInventoryDisplayStatus
): HuellaTreatment => HUELLA_TREATMENT[status] ?? DEFAULT_TREATMENT;
