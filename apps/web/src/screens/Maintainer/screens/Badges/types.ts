import type { BadgeDTO } from "@repo/types";

export type BadgeDialogState =
  | { mode: "activate"; incoming: BadgeDTO; outgoing: BadgeDTO }
  | { mode: "deactivate"; outgoing: BadgeDTO }
  | null;
