import type { Theme } from "@mui/material/styles";

export const sidebarTransition = (
  theme: Theme,
  property: string | string[]
): string =>
  theme.transitions.create(property, {
    easing: theme.transitions.easing.easeInOut,
    duration: theme.transitions.duration.complex,
  });
