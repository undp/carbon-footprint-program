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

export const sortOrderByLabel = <
  T extends { label: string; sortOrder: number },
>(
  config: Record<string, T>
): Record<string, number> =>
  Object.fromEntries(
    Object.values(config).map((entry) => [entry.label, entry.sortOrder])
  );
