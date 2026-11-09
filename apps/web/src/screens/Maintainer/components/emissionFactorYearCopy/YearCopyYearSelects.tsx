import { FC } from "react";
import { Box, MenuItem, TextField, Typography } from "@mui/material";
import { ArrowForwardOutlined } from "@mui/icons-material";

interface Props {
  sourceYear: number;
  targetYear: number;
  sourceYearOptions: readonly number[];
  targetYearOptions: readonly number[];
  editedCount: number;
  totalCount: number;
  onSourceYearChange: (year: number) => void;
  onTargetYearChange: (year: number) => void;
}

export const YearCopyYearSelects: FC<Props> = ({
  sourceYear,
  targetYear,
  sourceYearOptions,
  targetYearOptions,
  editedCount,
  totalCount,
  onSourceYearChange,
  onTargetYearChange,
}) => (
  <Box
    className="flex flex-wrap items-center justify-between gap-3"
    sx={{ mb: 2 }}
  >
    <Box className="flex items-center gap-2">
      <TextField
        select
        size="small"
        label="Origen"
        value={sourceYear}
        onChange={(event) => onSourceYearChange(Number(event.target.value))}
        sx={{ minWidth: 120 }}
      >
        {sourceYearOptions.map((year) => (
          <MenuItem key={year} value={year}>
            {year}
          </MenuItem>
        ))}
      </TextField>
      <ArrowForwardOutlined color="action" />
      <TextField
        select
        size="small"
        label="Destino"
        value={targetYear}
        onChange={(event) => onTargetYearChange(Number(event.target.value))}
        sx={{ minWidth: 120 }}
      >
        {targetYearOptions.map((year) => (
          <MenuItem key={year} value={year}>
            {year}
          </MenuItem>
        ))}
      </TextField>
    </Box>
    <Typography variant="body2" color="text.secondary">
      {editedCount} de {totalCount} con cambios
    </Typography>
  </Box>
);
