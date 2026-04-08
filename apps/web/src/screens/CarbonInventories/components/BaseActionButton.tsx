import { FC, PropsWithChildren } from "react";
import { IconButtonProps, IconButton, SxProps, Theme } from "@mui/material";

export const BaseActionButton: FC<PropsWithChildren<IconButtonProps>> = ({
  children,
  sx,
  ...props
}) => {
  const baseStyles: SxProps<Theme> = (theme) => ({
    border: `1px solid ${props.disabled ? theme.palette.action.disabled : theme.palette.primary.main}`,
    height: 36,
    width: 36,
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
