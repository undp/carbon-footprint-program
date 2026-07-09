import { FC } from "react";
import { IconButtonProps } from "@mui/material";
import type { SvgIconComponent } from "@mui/icons-material";
import { BaseActionButton } from "./BaseActionButton";

interface AdminActionButtonProps extends Pick<
  IconButtonProps,
  "onClick" | "disabled" | "color" | "className" | "sx" | "size" | "aria-label"
> {
  icon: SvgIconComponent;
  tooltip: string;
}

/**
 * Standard action button for admin/Maintainer datagrid action columns.
 * Icon-only: the icon is passed via the `icon` prop and rendered at the
 * inherited font size. Built on `BaseActionButton`, which provides the
 * mandatory tooltip and the disabled-safe wrapper; any extra styling (border,
 * spacing) comes from the caller's `sx`.
 */
export const AdminActionButton: FC<AdminActionButtonProps> = ({
  icon: Icon,
  tooltip,
  ...rest
}) => (
  <BaseActionButton tooltip={tooltip} {...rest}>
    <Icon fontSize="inherit" />
  </BaseActionButton>
);
