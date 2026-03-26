import { FC, useCallback } from "react";
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from "@mui/material";
import type { GetCarbonInventoriesMinimalResponse } from "@repo/types";

interface ReductionPlanHeaderProps {
  availableYears: string[];
  inventories: GetCarbonInventoriesMinimalResponse;
  selectedYear: string;
  selectedCarbonInventory: string;
  onYearChange: (year: string) => void;
  onCarbonInventoryChange: (inventoryId: string) => void;
}

export const ReductionPlanHeader: FC<ReductionPlanHeaderProps> = ({
  availableYears,
  inventories,
  selectedYear,
  selectedCarbonInventory,
  onYearChange,
  onCarbonInventoryChange,
}) => {
  const onYearSelectChange = useCallback(
    (event: SelectChangeEvent) => {
      onYearChange(event.target.value);
    },
    [onYearChange]
  );

  const onCarbonInventorySelectChange = useCallback(
    (event: SelectChangeEvent) => {
      onCarbonInventoryChange(event.target.value);
    },
    [onCarbonInventoryChange]
  );

  const selectedInventoryName =
    inventories.find((inv) => inv.id === selectedCarbonInventory)?.name ?? "";

  return (
    <Box className="flex flex-row items-center justify-between gap-4 rounded-lg bg-white p-4">
      <Typography variant="h5" fontWeight={600}>
        {selectedInventoryName || "Plan de reducción"}
      </Typography>
      <Box className="flex flex-row gap-4">
        <FormControl sx={{ minHeight: 40, minWidth: 120 }} size="small">
          <InputLabel id="reduction-year-select-label">Año</InputLabel>
          <Select
            labelId="reduction-year-select-label"
            label="Año"
            value={selectedYear}
            onChange={onYearSelectChange}
            disabled={availableYears.length === 0}
          >
            {availableYears.map((year) => (
              <MenuItem key={year} value={year}>
                {year}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minHeight: 40, minWidth: 216 }} size="small">
          <InputLabel id="reduction-inventory-select-label">Huella</InputLabel>
          <Select
            labelId="reduction-inventory-select-label"
            label="Huella"
            value={selectedCarbonInventory}
            onChange={onCarbonInventorySelectChange}
            disabled={inventories.length === 0 || !selectedYear}
          >
            {inventories.map(({ id, name }) => (
              <MenuItem key={id} value={id}>
                {name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    </Box>
  );
};
