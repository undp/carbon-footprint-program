import { FC } from "react";
import { Chip } from "@mui/material";
import { SxProps, Theme } from "@mui/material/styles";
import { deriveCategoryColors } from "@/utils/categoryColors";

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
  const colors = deriveCategoryColors(categoryColor);

  return (
    <Chip
      label={label}
      size="small"
      sx={{
        backgroundColor: colors.light,
        border: `1px solid ${colors.light}`,
        color: colors.dark,
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
