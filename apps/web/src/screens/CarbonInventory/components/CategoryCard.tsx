import { FC } from "react";
import { Box, darken, Typography, useTheme } from "@mui/material";
import { InfoButton } from "@/components";
import {
  DirectEmissionCategoryIcon,
  IndirectEmissionCategoryIcon,
  OthersCategoryIcon,
} from "@/icons";

interface CategoryCardProps {
  position: 1 | 2 | 3;
  title: string;
  subtitle: string;
  description: string;
}

export const CategoryCard: FC<CategoryCardProps> = ({
  position,
  title,
  subtitle,
  description,
}) => {
  const theme = useTheme();
  const icons = {
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
  };

  const backgroundColor = theme.palette.category[position].light;

  const icon = icons[position];

  return (
    <Box
      className="flex w-full flex-row justify-start gap-2 self-stretch p-2"
      sx={{
        backgroundColor,
        borderRadius: "8px",
      }}
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
        <InfoButton label="Más información de la categoría" />
      </Box>
    </Box>
  );
};
