export enum StatusFamily {
  POSITIVE = "positive",
  IN_REVIEW = "in_review",
  ACTION_REQUIRED = "action_required",
  NEGATIVE = "negative",
  NEUTRAL = "neutral",
}

export interface ChipLabel {
  label: string;
  tooltip: string;
  // Only set on configs whose grid sorts via `sortOrderByKey`; omitted elsewhere.
  sortOrder?: number;
}

export interface StatusConfig extends ChipLabel {
  family: StatusFamily;
}
