export enum StatusFamily {
  POSITIVE = "positive",
  IN_REVIEW = "in_review",
  ACTION_REQUIRED = "action_required",
  NEGATIVE = "negative",
  NEUTRAL = "neutral",
}

export interface StatusConfig {
  family: StatusFamily;
  label: string;
  tooltip: string;
  // Only set on configs whose grid sorts via `sortOrderByKey`; omitted elsewhere.
  sortOrder?: number;
}

export interface CustomPaletteConfig {
  color: string;
  label: string;
  tooltip: string;
  // Only set on configs whose grid sorts via `sortOrderByKey`; omitted elsewhere.
  sortOrder?: number;
}

export const sortOrderByKey = <K extends string>(
  config: Record<K, { sortOrder?: number }>
): Record<K, number> =>
  Object.fromEntries(
    (Object.entries(config) as [K, { sortOrder?: number }][]).map(
      ([key, value]) => [key, value.sortOrder ?? 0]
    )
  ) as Record<K, number>;
