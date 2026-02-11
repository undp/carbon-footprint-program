import { FC } from "react";
import { Chip } from "@mui/material";
import { SxProps, Theme, useTheme } from "@mui/material/styles";

interface CategoryChipProps {
  label: string;
  categoryPosition: number;
  sx?: SxProps<Theme>;
}

export const CategoryChip: FC<CategoryChipProps> = ({
  label,
  categoryPosition,
  sx,
}) => {
  const theme = useTheme();
  const catKey = Math.min(categoryPosition, 3) as 1 | 2 | 3;

  return (
    <Chip
      label={label}
      size="small"
      sx={{
        backgroundColor: theme.palette.category[catKey].light,
        border: `1px solid ${theme.palette.category[catKey].light}`,
        color: theme.palette.category[catKey].dark,
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
