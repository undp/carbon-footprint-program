import { FC, useMemo } from "react";
import { Box, darken, Typography, useTheme, Card } from "@mui/material";
import { InfoButton } from "@/components";
import {
  DirectEmissionCategoryIcon,
  IndirectEmissionCategoryIcon,
  OthersCategoryIcon,
} from "@/icons";

interface CategoryCardProps {
  variant?: "default" | "focused" | "unfocused";
  position: number;
  title: string;
  subtitle: string | null;
  description: string | null;
  onClick?: () => void;
}

export const CategoryCard: FC<CategoryCardProps> = ({
  variant = "default",
  position,
  title,
  subtitle,
  description,
  onClick,
}) => {
  const theme = useTheme();
  const icons: Record<number, React.ReactNode> = useMemo(
    () => ({
      1: (
        <DirectEmissionCategoryIcon
          sx={{ fill: darken(theme.palette.category[1].main, 0.6) }}
        />
      ),
      2: (
        <IndirectEmissionCategoryIcon
          sx={{ fill: darken(theme.palette.category[2].main, 0.6) }}
        />
      ),
      3: (
        <OthersCategoryIcon
          sx={{ fill: darken(theme.palette.category[3].main, 0.6) }}
        />
      ),
    }),
    [theme]
  );
  // Ensure the position is between 1 and 3
  // TODO: In the future should exists a default value for positions greater than 3
  // For now, we will use the last category
  const safePosition = Math.max(Math.min(position, 3), 1) as 1 | 2 | 3;
  const backgroundColor = theme.palette.category[safePosition].light;
  const border =
    variant === "focused"
      ? `1px solid ${theme.palette.category[safePosition].main}`
      : "none";
  const opacity = variant === "unfocused" ? "opacity-50" : "";
  const icon = icons[safePosition];
  const color = darken(theme.palette.category[safePosition].main, 0.6);

  const isClickable = Boolean(variant !== "default" && onClick);

  return (
    <Card
      elevation={variant === "focused" ? 2 : 0}
      onClick={isClickable ? onClick : undefined}
      className={`flex w-full flex-row items-center justify-start gap-2 ${opacity}`}
      sx={{
        padding: 1,
        borderRadius: 2,
        backgroundColor,
        border,
        ...(isClickable && {
          cursor: "pointer",
          textAlign: "left",
          textTransform: "none",
          "&:hover": {
            backgroundColor: darken(backgroundColor, 0.05),
            boxShadow: theme.shadows[4],
          },
        }),
      }}
    >
      <Box
        className="flex h-14 w-14 shrink-0 items-center justify-center"
        sx={{
          borderRadius: "50%",
          backgroundColor,
          "& svg": { width: "60%", height: "60%" },
        }}
      >
        {icon}
      </Box>
      <Box className="flex-1">
        <Typography
          fontSize="0.65rem"
          fontWeight="medium"
          lineHeight="normal"
          color={color}
        >
          {subtitle?.toUpperCase() ?? ""}
        </Typography>
        <Typography variant="body1" fontWeight="medium" color={color}>
          {title}
        </Typography>
        <Typography fontSize="0.65rem" lineHeight="normal" color={color}>
          {description}
        </Typography>
      </Box>
      <Box className="flex flex-col items-end justify-center">
        <InfoButton
          sx={{
            width: "24px",
            height: "24px",
            color: darken(theme.palette.category[position].main, 0.6),
          }}
          label="Más información de la categoría"
          disabled={variant === "unfocused"}
          onClick={(e) => {
            e.stopPropagation();
            //TODO: Open a modal with the information
          }}
        />
      </Box>
    </Card>
  );
};
