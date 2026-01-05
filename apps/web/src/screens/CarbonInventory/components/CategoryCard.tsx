import { FC, useMemo } from "react";
import { Box, darken, Typography, useTheme } from "@mui/material";
import { InfoButton } from "@/components";
import {
  DirectEmissionCategoryIcon,
  IndirectEmissionCategoryIcon,
  OthersCategoryIcon,
} from "@/icons";

interface CategoryCardProps {
  variant?: "default" | "focused" | "unfocused";
  position: 1 | 2 | 3;
  title: string;
  subtitle: string;
  description: string;
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
  const icons = useMemo(
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

  const backgroundColor = theme.palette.category[position].light;
  const borderColor =
    variant === "focused" ? theme.palette.category[position].main : null;
  const border = borderColor ? `1px solid ${borderColor}` : "none";

  const opacity = variant === "unfocused" ? "opacity-50" : "";
  const cursor = onClick ? "cursor-pointer" : "cursor-default";

  const icon = icons[position];

  return (
    <Card
      elevation={variant === "focused" ? 2 : 0}
      className={`flex w-full flex-row justify-start gap-2 self-stretch p-2 ${opacity} ${cursor}`}
      sx={{
        backgroundColor,
        borderRadius: "8px",
        border,
      }}
      onClick={onClick}
    >
      <Box
        className="flex h-16 w-16 items-center justify-center"
        sx={{
          borderRadius: "50%",
          backgroundColor,
          "& svg": { width: "60%", height: "60%" },
        }}
      >
        {icon}
      </Box>
      <Box className="flex-1">
        <Typography variant="body2">{subtitle}</Typography>
        <Typography variant="body1" fontWeight="fontWeightBold">
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </Box>
      <Box className="flex flex-col items-end justify-center">
        <InfoButton
          label="Más información de la categoría"
          disabled={variant === "unfocused"}
        />
      </Box>
    </Card>
  );
};
