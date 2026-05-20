import { FC } from "react";
import { Tooltip, Typography, type TypographyProps } from "@mui/material";
import { useOverflowTooltip } from "@/hooks";

type OverflowTooltipTextProps = TypographyProps & {
  lines?: number;
};

export const OverflowTooltipText: FC<OverflowTooltipTextProps> = ({
  children,
  variant = "body2",
  sx,
  lines = 1,
  ...rest
}) => {
  const { isOverflowed, overflowRef } = useOverflowTooltip<HTMLSpanElement>([
    typeof children === "string" || typeof children === "number"
      ? children
      : null,
  ]);

  const safeLines = Number.isInteger(lines) && lines >= 1 ? lines : 1;
  const isMultiLine = safeLines > 1;

  return (
    <Tooltip
      title={isOverflowed ? children : ""}
      arrow
      placement="top"
      enterDelay={500}
    >
      <Typography
        ref={overflowRef}
        variant={variant}
        noWrap={!isMultiLine}
        sx={{
          maxWidth: "100%",
          ...sx,
          ...(isMultiLine && {
            display: "-webkit-box",
            overflow: "hidden",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: safeLines,
            wordBreak: "break-word",
          }),
        }}
        {...rest}
      >
        {children}
      </Typography>
    </Tooltip>
  );
};
