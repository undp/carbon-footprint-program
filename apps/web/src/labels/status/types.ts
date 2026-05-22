import { ReactNode } from "react";

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
  icon?: ReactNode;
}

export interface CustomPaletteConfig {
  color: string;
  label: string;
  tooltip: string;
  sortOrder: number;
  icon?: ReactNode;
}
