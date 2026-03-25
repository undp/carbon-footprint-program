import { FC } from "react";
import { Chip } from "@mui/material";
import { SxProps, Theme } from "@mui/material/styles";
import { getColorPalette } from "@/utils/categoryColors";

interface CategoryChipProps {
  label: string;
  categoryColor: string;
  sx?: SxProps<Theme>;
}

export const CategoryChip: FC<CategoryChipProps> = ({
  label,
  categoryColor,
  sx,
}) => {
  const categoryColorPalette = getColorPalette(categoryColor);

  return (
    <Chip
      label={label}
      size="small"
      sx={{
        backgroundColor: categoryColorPalette.light,
        border: `1px solid ${categoryColorPalette.main}`,
        color: categoryColorPalette.dark,
        fontSize: "0.75rem",
        fontWeight: 500,
        height: "26px",
        borderRadius: "14px",
        "& .MuiChip-label": { px: 2, py: 0.75 },
        ...sx,
      }}
    />
  );
};
