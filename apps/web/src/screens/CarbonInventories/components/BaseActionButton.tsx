import { FC, PropsWithChildren } from "react";
import { IconButtonProps, IconButton, SxProps, Theme } from "@mui/material";

/**
 * Filled primary styling for the main row action (e.g. Autodeclarar, Postular
 * a reconocimiento). Apply via `sx` on a BaseActionButton to keep the look
 * consistent across DraftsTab and InventoriesTab.
 */
export const primaryActionButtonSx: SxProps<Theme> = (theme) => ({
  color: theme.palette.common.white,
  minHeight: 30,
  minWidth: "auto",
  px: 1.5,
  py: 0.5,
  borderRadius: "4px",
  backgroundColor: theme.palette.primary.main,
  "&:hover": {
    backgroundColor: theme.palette.primary.dark,
  },
});

export const BaseActionButton: FC<PropsWithChildren<IconButtonProps>> = ({
  children,
  sx,
  ...props
}) => {
  const baseStyles: SxProps<Theme> = (theme) => ({
    border: `1px solid ${props.disabled ? theme.palette.action.disabled : theme.palette.primary.main}`,
    height: 30,
    width: 30,
    borderRadius: "4px",
    padding: "4px",
  });

  const sxArray = (Array.isArray(sx) ? sx : sx ? [sx] : []) as SxProps<Theme>[];
  const combinedStyles = [baseStyles, ...sxArray] as SxProps<Theme>;

  return (
    <IconButton sx={combinedStyles} color="primary" size="small" {...props}>
      {children}
    </IconButton>
  );
};
