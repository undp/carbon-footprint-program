import { FC, PropsWithChildren } from "react";
import { SxProps, Theme } from "@mui/material";
import { BaseActionButton, BaseActionButtonProps } from "./BaseActionButton";

/**
 * Filled primary styling for the main row action (e.g. Autodeclarar, Postular
 * a reconocimiento). Apply via `sx` on an AppActionButton to keep the look
 * consistent across user-side tables.
 */
export const primaryActionButtonSx: SxProps<Theme> = (theme) => ({
  color: theme.palette.common.white,
  backgroundColor: theme.palette.primary.main,
  border: "none",
  "&:hover": {
    backgroundColor: theme.palette.primary.dark,
  },
});

const appActionButtonStyles: SxProps<Theme> = {
  border: "1px solid",
  borderColor: "currentColor",
  height: 30,
  width: 30,
  borderRadius: "4px",
  padding: "4px",
};

/**
 * Standard action button for user-side (app) datagrid action columns.
 * Enforces the consistent 30x30 bordered icon-button look; the border follows
 * the `color` prop via `currentColor` so it adapts to primary/success/etc.
 * without extra config. Built on `BaseActionButton`, which provides the
 * mandatory tooltip and disabled-safe wrapper.
 */
export const AppActionButton: FC<PropsWithChildren<BaseActionButtonProps>> = ({
  children,
  sx,
  ...props
}) => {
  const sxArray = (Array.isArray(sx) ? sx : sx ? [sx] : []) as SxProps<Theme>[];
  const combinedStyles = [appActionButtonStyles, ...sxArray] as SxProps<Theme>;

  return (
    <BaseActionButton sx={combinedStyles} color="primary" {...props}>
      {children}
    </BaseActionButton>
  );
};
