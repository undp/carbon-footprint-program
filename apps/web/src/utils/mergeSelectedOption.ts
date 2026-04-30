import { unionBy } from "lodash-es";

/**
 * Merges a single "currently selected" entity into a list of options, ensuring it is
 * present even when the upstream list filters it out (e.g., the public list endpoint
 * returns only ACTIVE catalog rows, but the form's persisted value may reference a
 * DELETED row whose name still needs to render).
 *
 * The result is sorted alphabetically by name, with locale-aware comparison.
 *
 * Returns `options` unchanged when `selected` is null or undefined.
 */
export const mergeSelectedOption = <
  T extends { id: string | number; name: string },
>(
  options: T[],
  selected: T | null | undefined
): T[] => {
  if (!selected) return options;

  return unionBy(options, [selected], "id").sort((a, b) =>
    a.name.localeCompare(b.name, "es", { sensitivity: "base" })
  );
};
