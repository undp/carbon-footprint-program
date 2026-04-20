import { FC } from "react";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
} from "@mui/material";

interface YearFilterProps {
  years: number[];
  value: number | undefined;
  onChange: (year: number | undefined) => void;
}

export const YearFilter: FC<YearFilterProps> = ({ years, value, onChange }) => {
  const handleChange = (event: SelectChangeEvent<string>) => {
    const val = event.target.value;
    onChange(val === "all" ? undefined : parseInt(val, 10));
  };

  return (
    <FormControl size="small" sx={{ minWidth: 120 }}>
      <InputLabel>Año</InputLabel>
      <Select
        label="Año"
        value={value !== undefined ? String(value) : "all"}
        onChange={handleChange}
      >
        <MenuItem value="all">Todos</MenuItem>
        {years.map((year) => (
          <MenuItem key={year} value={String(year)}>
            {year}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
