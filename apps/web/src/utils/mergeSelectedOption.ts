/**
 * Merges a single "currently selected" entity into a list of options, ensuring it is
 * present even when the upstream list filters it out (e.g., the public list endpoint
 * returns only ACTIVE catalog rows, but the form's persisted value may reference a
 * DELETED row whose name still needs to render).
 *
 * The result is sorted alphabetically by name, with locale-aware comparison.
 *
 * Returns `options` unchanged when:
 * - `selected` is null or undefined
 * - `selected.id` is already present in the options list
 *
 * Otherwise prepends `selected` and re-sorts.
 *
 * Identity-stable when no merge is needed: returns the same array reference, so
 * downstream `useMemo`/`React.memo` callers do not re-render unnecessarily.
 */
export const mergeSelectedOption = <
  T extends { id: string | number; name: string },
>(
  options: T[],
  selected: T | null | undefined
): T[] => {
  if (!selected) return options;
  if (options.some((option) => option.id === selected.id)) return options;
  return [...options, selected].sort((a, b) =>
    a.name.localeCompare(b.name, "es", { sensitivity: "base" })
  );
};
