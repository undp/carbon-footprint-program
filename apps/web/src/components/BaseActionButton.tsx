import { FC, PropsWithChildren } from "react";
import {
  IconButtonProps,
  IconButton,
  Tooltip,
  TooltipProps,
} from "@mui/material";

export interface BaseActionButtonProps extends IconButtonProps {
  tooltip: string;
  tooltipPlacement?: TooltipProps["placement"];
}

/**
 * Shared foundation for action buttons. Owns the invariant concerns common to
 * every action column: a mandatory Tooltip wrapped in a `<span>` (so it stays
 * active while the button is disabled), an `aria-label` that defaults to the
 * tooltip, and the small size. It is intentionally style-agnostic — consumers
 * should reach for `AppActionButton` (user-side) or `AdminActionButton`
 * (Maintainer) rather than using this directly.
 */
export const BaseActionButton: FC<PropsWithChildren<BaseActionButtonProps>> = ({
  children,
  tooltip,
  tooltipPlacement,
  "aria-label": ariaLabel,
  ...props
}) => (
  <Tooltip title={tooltip} placement={tooltipPlacement}>
    <span className="content-center">
      <IconButton aria-label={ariaLabel ?? tooltip} size="small" {...props}>
        {children}
      </IconButton>
    </span>
  </Tooltip>
);
