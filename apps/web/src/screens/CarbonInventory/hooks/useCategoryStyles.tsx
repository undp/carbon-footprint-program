import { useMemo } from "react";
import { useTheme } from "@mui/material";
import {
  DirectEmissionCategoryIcon,
  IndirectEmissionCategoryIcon,
  OthersCategoryIcon,
} from "@/icons";

export const useCategoryStyles = () => {
  const theme = useTheme();

  return useMemo(
    () => ({
      1: {
        icon: (
          <DirectEmissionCategoryIcon sx={{ width: "60%", height: "60%" }} />
        ),
        color: theme.palette.category.one.light,
        label: "Alcance 1",
      },
      2: {
        icon: (
          <IndirectEmissionCategoryIcon sx={{ width: "60%", height: "60%" }} />
        ),
        color: theme.palette.category.two.light,
        label: "Alcance 2",
      },
      3: {
        icon: <OthersCategoryIcon sx={{ width: "60%", height: "60%" }} />,
        color: theme.palette.category.three.light,
        label: "Alcance 3",
      },
    }),
    [theme]
  );
};
