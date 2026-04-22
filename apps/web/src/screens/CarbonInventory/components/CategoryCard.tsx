import { FC } from "react";
import { Box, Typography, Card } from "@mui/material";
import { darken } from "@mui/material/styles";
import type { IconName } from "@repo/types";
import { InfoButton } from "@/components";
import { CATEGORY_ICON_MAP } from "@/utils/categoryIcons";
import { getColorPalette } from "@/utils/categoryColors";
import { useExplanationDialog } from "../../../contexts";

interface CategoryCardProps {
  variant?: "default" | "focused" | "unfocused";
  icon: IconName;
  categoryColor: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  explanation: string | null;
  onClick?: () => void;
}

export const CategoryCard: FC<CategoryCardProps> = ({
  variant = "default",
  icon,
  categoryColor,
  title,
  subtitle,
  description,
  explanation,
  onClick,
}) => {
  const { openExplanationContent } = useExplanationDialog();
  const isUnfocused = variant === "unfocused";
  const isFocused = variant === "focused";

  const categoryColorPalette = getColorPalette(categoryColor);
  const IconComponent = CATEGORY_ICON_MAP[icon];
  const backgroundColor = categoryColorPalette.light;
  const border =
    variant === "focused" ? `1px solid ${categoryColorPalette.main}` : "none";
  const opacity = variant === "unfocused" ? "opacity-50" : "";
  const textColor = categoryColorPalette.dark;

  const isClickable = Boolean(variant !== "default" && onClick);

  return (
    <Card
      elevation={isFocused ? 2 : 0}
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
        {IconComponent && (
          <IconComponent sx={{ fill: categoryColorPalette.dark }} />
        )}
      </Box>
      <Box className="flex-1">
        <Typography
          fontSize="0.65rem"
          fontWeight="medium"
          lineHeight="normal"
          color={textColor}
        >
          {subtitle?.toUpperCase() ?? ""}
        </Typography>
        <Typography variant="body1" fontWeight="medium" color={textColor}>
          {title}
        </Typography>
        <Typography fontSize="0.65rem" lineHeight="normal" color={textColor}>
          {description}
        </Typography>
      </Box>
      <Box className="flex flex-col items-end justify-center">
        <InfoButton
          label="Más información de la categoría"
          disabled={isUnfocused}
          onClick={(e) => {
            e.stopPropagation();
            openExplanationContent(explanation);
          }}
        />
      </Box>
    </Card>
  );
};
