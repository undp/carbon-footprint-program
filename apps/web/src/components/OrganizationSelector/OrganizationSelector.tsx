import { FC } from "react";
import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import type { SelectProps } from "@mui/material";
import type { GetMyOrganizationsSelectorOptionsResponse } from "@repo/types";

export interface OrganizationSelectorProps {
  organizations: GetMyOrganizationsSelectorOptionsResponse;
  value: string;
  onChange: (value: string) => void;
  isLoading?: boolean;
  allowAll?: boolean;
  size?: SelectProps["size"];
  minWidth?: number;
  label?: string;
}

export const OrganizationSelector: FC<OrganizationSelectorProps> = ({
  organizations,
  value,
  onChange,
  isLoading = false,
  allowAll = false,
  size = "small",
  minWidth = 240,
  label = "Organización",
}) => {
  const labelId = `${label.toLowerCase().replace(/\s+/g, "-")}-select-label`;

  return (
    <FormControl sx={{ minHeight: 40, minWidth }} size={size}>
      <InputLabel id={labelId}>{label}</InputLabel>
      <Select
        labelId={labelId}
        label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isLoading}
      >
        {allowAll && <MenuItem value="all">Todas las organizaciones</MenuItem>}
        {organizations.map((org) => (
          <MenuItem key={org.id} value={org.id}>
            {org.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
