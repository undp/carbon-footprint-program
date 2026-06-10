// Helpers that adapt the chip label configs (labels/chips/*) to MUI DataGrid
// column options. Both expect the column's `valueGetter` to return the enum
// key, so sorting and filtering operate on a stable identity while the user
// sees the Spanish label.

// Feeds `valueOptions` of a `singleSelect` grid column so filtering and
// export use the visible label while the cell value stays the enum key.
export const toValueOptions = <K extends string>(
  config: Record<K, { label: string }>
): { value: K; label: string }[] =>
  (Object.entries(config) as [K, { label: string }][]).map(
    ([value, { label }]) => ({ value, label })
  );

// Collapses a config into a key → sortOrder map for `sortComparator`.
// `sortOrder` is required on every entry: declare the config with `satisfies`
// so a key added without it fails to compile instead of silently tying.
export const sortOrderByKey = <K extends string>(
  config: Record<K, { sortOrder: number }>
): Record<K, number> =>
  Object.fromEntries(
    (Object.entries(config) as [K, { sortOrder: number }][]).map(
      ([key, value]) => [key, value.sortOrder]
    )
  ) as Record<K, number>;
