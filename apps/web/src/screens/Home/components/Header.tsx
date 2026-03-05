import { FC, useCallback } from "react";
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Skeleton,
} from "@mui/material";
import {
  CarbonInventoryAvailableYearsResponse,
  GetAllCarbonInventoriesResponse,
} from "@repo/types";

interface Props {
  availableYears: CarbonInventoryAvailableYearsResponse;
  onYearChange: (year: string) => void;
  inventories: GetAllCarbonInventoriesResponse;
  onCarbonInventoryChange: (inventoryId: string) => void;
  isLoadingInventories: boolean;
  selectedYear: string;
  selectedCarbonInventory: string;
}

export const Header: FC<Props> = ({
  availableYears,

  onYearChange,
  inventories,
  onCarbonInventoryChange,
  isLoadingInventories,
  selectedYear,
  selectedCarbonInventory,
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

  if (isLoadingInventories) {
    return (
      <Box className="flex flex-row items-center justify-between gap-4 rounded-lg bg-white p-4">
        <Skeleton variant="text" width={200} height={36} />
        <Box className="flex flex-row gap-4">
          <Skeleton variant="rounded" width={120} height={40} />
          <Skeleton variant="rounded" width={216} height={40} />
        </Box>
      </Box>
    );
  }

  return (
    <Box className="flex flex-row items-center justify-between gap-4 rounded-lg bg-white p-4">
      <Typography variant="h5" fontWeight={600}>
        {selectedCarbonInventory
          ? `Emisiones ${inventories.find((inv) => inv.id === selectedCarbonInventory)?.name || ""}`
          : "Emisiones"}
      </Typography>
      <Box className="flex flex-row gap-4">
        <FormControl sx={{ minHeight: 40, minWidth: 120 }} size="small">
          <InputLabel id="year-select-label">Año</InputLabel>
          <Select
            labelId="year-select-label"
            label="Año"
            value={selectedYear}
            onChange={onYearSelectChange}
            disabled={isLoadingInventories}
          >
            {availableYears.map((year) => (
              <MenuItem key={year} value={`${year}`}>
                {year}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minHeight: 40, minWidth: 216 }} size="small">
          <InputLabel id="carbon-inventories-select-label">Huellas</InputLabel>
          <Select
            labelId="carbon-inventories-select-label"
            label="Huellas"
            value={selectedCarbonInventory}
            onChange={onCarbonInventorySelectChange}
            disabled={
              isLoadingInventories || inventories.length === 0 || !selectedYear
            }
          >
            {inventories.map(({ id, name }) => (
              <MenuItem key={id} value={`${id}`}>
                {name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    </Box>
  );
};
