import { FC } from "react";
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";

interface Props {
  year: number;
  onYearChange: (year: number) => void;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 6 }, (_, i) => CURRENT_YEAR - i);

export const DashboardHeader: FC<Props> = ({ year, onYearChange }) => {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Typography variant="h5" fontWeight={700}>
        Dashboard General
      </Typography>
      <FormControl size="small" sx={{ minWidth: 120 }}>
        <InputLabel id="year-select-label">Año</InputLabel>
        <Select
          labelId="year-select-label"
          id="year-select"
          value={year}
          label="Año"
          onChange={(e) => onYearChange(Number(e.target.value))}
        >
          {YEAR_OPTIONS.map((y) => (
            <MenuItem key={y} value={y}>
              {y}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Box>
  );
};
