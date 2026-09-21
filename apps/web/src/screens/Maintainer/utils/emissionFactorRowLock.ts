/**
 * Whether an emission-factor row may be written, and why not when it may not.
 * The reason is rendered as a tooltip, so it is Spanish UI text.
 */
export interface EmissionFactorRowLock {
  canEdit: boolean;
  reason?: string;
  /**
   * Lines depending on this factor that sit under a footprint nobody claimed.
   * They never lock the row — they are what the delete confirmation names.
   */
  unclaimedReferencedLineCount: number;
}

const lines = (count: number) => `${count} ${count === 1 ? "línea" : "líneas"}`;

/**
 * The rule the maintainer applies per row: a factor is immutable while a line
 * of a claimed footprint depends on it, whatever the status of the methodology
 * version it belongs to. The API enforces the same rule; this only stops the
 * grid from offering an edit that is already known to be refused.
 *
 * Lines of unclaimed anonymous footprints are deliberately not part of the
 * lock. The calculator is open, so any visitor can attach one, and nobody —
 * not the visitor, not an administrator — can delete the footprint afterwards.
 * Letting them lock would hand anonymous traffic a permanent freeze on the live
 * catalogue. They are surfaced as a warning before a delete instead.
 *
 * Both counts are undefined for a row the listing does not know about — one not
 * saved yet, or one created moments ago whose refetch has not landed. Both are
 * unreferenced by construction, which is what leaves a just-added factor
 * correctable.
 */
export const resolveEmissionFactorRowLock = (
  canEditScreen: boolean,
  referencedLineCount: number | undefined,
  unclaimedReferencedLineCount: number | undefined
): EmissionFactorRowLock => {
  const unclaimed = unclaimedReferencedLineCount ?? 0;

  if (!canEditScreen)
    return { canEdit: false, unclaimedReferencedLineCount: 0 };

  const count = referencedLineCount ?? 0;
  if (count === 0)
    return { canEdit: true, unclaimedReferencedLineCount: unclaimed };

  return {
    canEdit: false,
    reason: `Usado por ${lines(count)} de huella: no se puede modificar ni eliminar.`,
    unclaimedReferencedLineCount: unclaimed,
  };
};

/**
 * The confirmation shown before deleting a factor. When unclaimed footprints
 * depend on it the delete still goes through, so the message says what it will
 * leave behind rather than asking a question the maintainer cannot act on.
 */
export const resolveEmissionFactorDeleteMessage = (
  unclaimedReferencedLineCount: number
): string => {
  if (unclaimedReferencedLineCount === 0)
    return "¿Estás seguro de que deseas eliminar este factor de emisión?";

  return `${lines(unclaimedReferencedLineCount)} de huellas anónimas sin reclamar usan este factor. Conservan el valor que ya tienen guardado, pero el factor dejará de ofrecerse. ¿Eliminarlo igual?`;
};
