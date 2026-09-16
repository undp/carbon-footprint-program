/**
 * Whether an emission-factor row may be written, and why not when it may not.
 * The reason is rendered as a tooltip, so it is Spanish UI text.
 */
export interface EmissionFactorRowLock {
  canEdit: boolean;
  reason?: string;
}

/**
 * The rule the maintainer applies per row: a factor is immutable while an
 * active line depends on it, whatever the status of the methodology version it
 * belongs to. The API enforces the same rule; this only stops the grid from
 * offering an edit that is already known to be refused.
 *
 * `referencedLineCount` is undefined for a row the listing does not know about
 * — one not saved yet, or one created moments ago whose refetch has not landed.
 * Both are unreferenced by construction, which is what leaves a just-added
 * factor correctable.
 */
export const resolveEmissionFactorRowLock = (
  canEditScreen: boolean,
  referencedLineCount: number | undefined
): EmissionFactorRowLock => {
  if (!canEditScreen) return { canEdit: false };

  const count = referencedLineCount ?? 0;
  if (count === 0) return { canEdit: true };

  return {
    canEdit: false,
    reason: `Usado por ${count} ${count === 1 ? "línea" : "líneas"} de huella: no se puede modificar ni eliminar.`,
  };
};
