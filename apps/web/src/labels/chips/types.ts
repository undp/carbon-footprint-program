import type { ChipProps } from "@mui/material";

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
  sortOrder: number;
  icon?: ChipProps["icon"];
}

export interface CustomPaletteConfig {
  color: string;
  label: string;
  tooltip: string;
  sortOrder: number;
  icon?: ChipProps["icon"];
}

export const sortOrderByKey = <
  K extends string,
  T extends { sortOrder: number },
>(
  config: Record<K, T>
): Record<K, number> =>
  Object.fromEntries(
    (Object.entries(config) as [K, T][]).map(([key, value]) => [
      key,
      value.sortOrder,
    ])
  ) as Record<K, number>;
