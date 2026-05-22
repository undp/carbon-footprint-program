import { FC, PropsWithChildren } from "react";
import {
  IconButtonProps,
  IconButton,
  SxProps,
  Theme,
  Tooltip,
  TooltipProps,
} from "@mui/material";

/**
 * Filled primary styling for the main row action (e.g. Autodeclarar, Postular
 * a reconocimiento). Apply via `sx` on a BaseActionButton to keep the look
 * consistent across user-side tables.
 */
export const primaryActionButtonSx: SxProps<Theme> = (theme) => ({
  color: theme.palette.common.white,
  minHeight: 30,
  minWidth: "auto",
  px: 1.5,
  py: 0.5,
  borderRadius: "4px",
  backgroundColor: theme.palette.primary.main,
  border: "none",
  "&:hover": {
    backgroundColor: theme.palette.primary.dark,
  },
});

interface BaseActionButtonProps extends IconButtonProps {
  tooltip: string;
  tooltipPlacement?: TooltipProps["placement"];
}

/**
 * Standard action button for user-side datagrid action columns.
 * Enforces consistent style (30x30 bordered icon button) + a mandatory
 * tooltip. The border follows the `color` prop via `currentColor` so it
 * adapts to primary/success/etc. without extra config.
 */
export const BaseActionButton: FC<PropsWithChildren<BaseActionButtonProps>> = ({
  children,
  sx,
  tooltip,
  tooltipPlacement,
  ...props
}) => {
  const baseStyles: SxProps<Theme> = {
    border: "1px solid",
    borderColor: "currentColor",
    height: 30,
    width: 30,
    borderRadius: "4px",
    padding: "4px",
  };

  const sxArray = (Array.isArray(sx) ? sx : sx ? [sx] : []) as SxProps<Theme>[];
  const combinedStyles = [baseStyles, ...sxArray] as SxProps<Theme>;

  return (
    <Tooltip title={tooltip} placement={tooltipPlacement}>
      <span className="content-center">
        <IconButton sx={combinedStyles} color="primary" size="small" {...props}>
          {children}
        </IconButton>
      </span>
    </Tooltip>
  );
};
