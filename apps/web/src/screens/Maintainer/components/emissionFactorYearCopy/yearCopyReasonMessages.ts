import {
  EmissionFactorYearCopyViolationReason,
  type EmissionFactorYearCopyViolationReason as Reason,
} from "@repo/types";

/** Why a cell blocks the copy, as its tooltip says it. */
export const YEAR_COPY_REASON_MESSAGES: Record<Reason, string> = {
  [EmissionFactorYearCopyViolationReason.DUPLICATE_TARGET_FACTOR]:
    "Otro factor copiado queda en la misma fila con esta fuente. Cambia la fuente de uno o quítalo de la copia.",
  [EmissionFactorYearCopyViolationReason.EMPTY_SOURCE]:
    "La fuente es obligatoria.",
  [EmissionFactorYearCopyViolationReason.EMPTY_VALUE]:
    "El valor es obligatorio.",
  [EmissionFactorYearCopyViolationReason.GAS_DETAILS_MISMATCH]:
    "El valor no coincide con su desglose GEI. Cópialo sin cambiar el valor y corrígelo en el mantenedor junto con el desglose.",
  [EmissionFactorYearCopyViolationReason.UNKNOWN_SOURCE_FACTOR]:
    "Este factor ya no está en el año de origen. Recarga la página.",
  [EmissionFactorYearCopyViolationReason.DUPLICATE_CHANGE]:
    "Este factor tiene cambios repetidos. Recarga la página.",
};

/** The reasons a value cell shows; the rest belong to the source cell. */
export const VALUE_REASONS: readonly Reason[] = [
  EmissionFactorYearCopyViolationReason.EMPTY_VALUE,
  EmissionFactorYearCopyViolationReason.GAS_DETAILS_MISMATCH,
];

export const reasonMessage = (
  reasons: readonly Reason[],
  shown: (reason: Reason) => boolean
): string | undefined => {
  const messages = reasons
    .filter(shown)
    .map((reason) => YEAR_COPY_REASON_MESSAGES[reason]);
  return messages.length > 0 ? messages.join(" ") : undefined;
};
