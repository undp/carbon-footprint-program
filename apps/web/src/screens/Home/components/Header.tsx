import { FC, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from "@mui/material";
import { GetCarbonInventoriesMinimalResponse } from "@repo/types";

interface Props {
  availableYears: string[];
  onYearChange: (year: string) => void;
  inventories: GetCarbonInventoriesMinimalResponse;
  onCarbonInventoryChange: (inventoryId: string) => void;
  selectedYear: string;
  selectedCarbonInventory: string;
}

export const Header: FC<Props> = ({
  availableYears,
  onYearChange,
  inventories,
  onCarbonInventoryChange,
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

  const selectedInventory = useMemo(
    () => inventories.find((inv) => inv.id === selectedCarbonInventory),
    [inventories, selectedCarbonInventory]
  );

  const selectedInventoryName = selectedInventory?.name ?? "";
  const selectedOrganizationName = selectedInventory?.organizationName ?? "";

  return (
    <Box className="flex flex-row items-center justify-between gap-4 rounded-lg bg-white p-4">
      <Box className="flex flex-col">
        <Typography variant="h5" fontWeight={600}>
          {selectedCarbonInventory
            ? `Emisiones ${selectedInventoryName}`
            : "Emisiones"}
        </Typography>
        {selectedOrganizationName && (
          <Typography variant="body2" color="text.secondary">
            {selectedOrganizationName}
          </Typography>
        )}
      </Box>
      <Box className="flex flex-row gap-4">
        <FormControl sx={{ minHeight: 40, minWidth: 120 }} size="small">
          <InputLabel id="year-select-label">Año</InputLabel>
          <Select
            labelId="year-select-label"
            label="Año"
            value={selectedYear}
            onChange={onYearSelectChange}
            disabled={availableYears.length === 0}
          >
            {availableYears.map((year) => (
              <MenuItem key={year} value={`${year}`}>
                {year}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minHeight: 40, minWidth: 216 }} size="small">
          <InputLabel id="carbon-inventories-select-label">Huella</InputLabel>
          <Select
            labelId="carbon-inventories-select-label"
            label="Huella"
            value={selectedCarbonInventory}
            onChange={onCarbonInventorySelectChange}
            disabled={inventories.length === 0 || !selectedYear}
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
