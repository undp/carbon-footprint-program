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
  const border =
    variant === "focused"
      ? `1px solid ${theme.palette.category[position].main}`
      : "none";
  const opacity = variant === "unfocused" ? "opacity-50" : "";
  const icon = icons[position];

  const isClickable = Boolean(variant !== "default" && onClick);

  return (
    <Card
      elevation={variant === "focused" ? 2 : 0}
      onClick={isClickable ? onClick : undefined}
      className={`flex w-full flex-row items-stretch justify-start gap-2 ${opacity}`}
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
        className="flex h-16 w-16 shrink-0 items-center justify-center"
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
          onClick={(e) => {
            e.stopPropagation();
            //TODO: Open a modal with the information
            alert("Information");
          }}
        />
      </Box>
    </Card>
  );
};
