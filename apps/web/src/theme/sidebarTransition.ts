import type { Theme } from "@mui/material/styles";

export const SIDEBAR_TRANSITION_EASING = "cubic-bezier(0.4, 0, 0.2, 1)";

export const sidebarTransition = (
  theme: Theme,
  property: string | string[]
): string =>
  theme.transitions.create(property, {
    easing: SIDEBAR_TRANSITION_EASING,
    duration: theme.transitions.duration.complex,
  });
