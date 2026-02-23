import { FC } from "react";
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from "@mui/material";
import { Branch } from "../types";

type PageHeaderProps = {
  organizationName: string;
  selectedYear: string;
  onYearChange: (year: string) => void;
  years: string[];
  selectedBranch: string;
  onBranchChange: (branchId: string) => void;
  branches: Branch[];
};

export const PageHeader: FC<PageHeaderProps> = ({
  organizationName,
  selectedYear,
  onYearChange,
  years,
  selectedBranch,
  onBranchChange,
  branches,
}) => {
  const handleYearChange = (event: SelectChangeEvent) => {
    onYearChange(event.target.value);
  };

  const handleBranchChange = (event: SelectChangeEvent) => {
    onBranchChange(event.target.value);
  };

  return (
    <Box className="flex items-center justify-between gap-6 rounded-lg bg-white p-4">
      <Typography
        variant="h6"
        component="h1"
        sx={{ fontWeight: 700, color: "text.primary", flex: 1 }}
      >
        Reducción {organizationName}
      </Typography>

      <Box className="flex items-center gap-6">
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel id="year-select-label">Año</InputLabel>
          <Select
            labelId="year-select-label"
            id="year-select"
            value={selectedYear}
            label="Año"
            onChange={handleYearChange}
          >
            {years.map((year) => (
              <MenuItem key={year} value={year}>
                {year}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 300 }}>
          <InputLabel id="branch-select-label">Sede/sucursal</InputLabel>
          <Select
            labelId="branch-select-label"
            id="branch-select"
            value={selectedBranch}
            label="Sede/sucursal"
            onChange={handleBranchChange}
          >
            {branches.map((branch) => (
              <MenuItem key={branch.id} value={branch.id}>
                {branch.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    </Box>
  );
};
