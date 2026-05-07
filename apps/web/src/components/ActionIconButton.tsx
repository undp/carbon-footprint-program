import { FC } from "react";
import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
import type { SvgIconComponent } from "@mui/icons-material";

interface ActionIconButtonProps
  extends Pick<
    IconButtonProps,
    "onClick" | "disabled" | "color" | "className"
  > {
  icon: SvgIconComponent;
  tooltip: string;
  ariaLabel?: string;
}

/**
 * Standard icon-only action button. Enforces the convention:
 * Outlined MUI icon + always-visible Tooltip (kept active while
 * disabled via the wrapping span).
 */
export const ActionIconButton: FC<ActionIconButtonProps> = ({
  icon: Icon,
  tooltip,
  ariaLabel,
  disabled,
  className,
  ...rest
}) => (
  <Tooltip title={tooltip}>
    <span className="content-center">
      <IconButton
        size="small"
        aria-label={ariaLabel ?? tooltip}
        disabled={disabled}
        className={className}
        {...rest}
      >
        <Icon fontSize="small" />
      </IconButton>
    </span>
  </Tooltip>
);
