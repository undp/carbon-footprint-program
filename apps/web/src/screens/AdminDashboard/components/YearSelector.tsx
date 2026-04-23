import { FC } from "react";
import { FormControl, MenuItem, Select } from "@mui/material";
import { DASHBOARD_YEARS_RANGE_FROM_CURRENT } from "@/config/constants";

interface YearSelectorProps {
  year?: number;
  onYearChange: (year?: number) => void;
}

export const YearSelector: FC<YearSelectorProps> = ({ year, onYearChange }) => {
  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: DASHBOARD_YEARS_RANGE_FROM_CURRENT },
    (_, i) => currentYear - i
  );

  return (
    <FormControl size="small" sx={{ minWidth: 120 }}>
      <Select
        value={year ?? "all"}
        onChange={(e) => {
          const val = e.target.value;
          onYearChange(val === "all" ? undefined : Number(val));
        }}
        displayEmpty
      >
        <MenuItem value="all">Todas</MenuItem>
        {years.map((y) => (
          <MenuItem key={y} value={y}>
            {y}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
