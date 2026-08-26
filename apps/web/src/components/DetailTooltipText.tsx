import { FC, ReactNode } from "react";
import { Tooltip, Typography, type TypographyProps } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

type DetailTooltipTextProps = TypographyProps & {
  /** Detail revealed on demand. When empty the text renders as plain text. */
  detail: ReactNode;
};

/**
 * Inline text that reveals extra detail on demand — used for the unrounded
 * value of an emission factor and for the calculation chain behind an
 * emission, both of which are audit information that only some users need.
 *
 * The trigger is focusable and reacts to tap, not only to desktop hover: an
 * audit trail reachable only with a mouse is no audit trail on a tablet.
 *
 * `tabIndex` defaults to `0` so standalone use stays keyboard-reachable, but a
 * caller inside a DataGrid should forward `GridRenderCellParams.tabIndex` so
 * the trigger joins the grid's roving-tabindex model instead of adding a fixed
 * tab stop per rendered row.
 */
export const DetailTooltipText: FC<DetailTooltipTextProps> = ({
  detail,
  children,
  sx,
  tabIndex = 0,
  ...rest
}) => {
  const theme = useTheme();

  if (!detail) {
    return (
      <Typography sx={sx} {...rest}>
        {children}
      </Typography>
    );
  }

  return (
    <Tooltip
      title={detail}
      arrow
      placement="top"
      describeChild
      enterTouchDelay={0}
      leaveTouchDelay={6000}
    >
      <Typography
        tabIndex={tabIndex}
        sx={{
          cursor: "help",
          textDecoration: "underline dotted",
          textDecorationColor: alpha(theme.palette.text.primary, 0.4),
          textUnderlineOffset: "2px",
          ...sx,
        }}
        {...rest}
      >
        {children}
      </Typography>
    </Tooltip>
  );
};
