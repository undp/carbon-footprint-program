import { FC, useId } from "react";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import type { SelectProps } from "@mui/material";
import type { GetMyOrganizationsSelectorOptionsResponse } from "@repo/types";
import { VOCAB } from "@/config/vocab";
import { capitalize } from "lodash-es";

export interface OrganizationSelectorProps {
  organizations: GetMyOrganizationsSelectorOptionsResponse;
  value: string;
  onChange: (value: string) => void;
  isLoading?: boolean;
  showNoneOption?: boolean;
  showAllOption?: boolean;
  size?: SelectProps["size"];
  minWidth?: number;
  label?: string;
}

export const OrganizationSelector: FC<OrganizationSelectorProps> = ({
  organizations,
  value,
  onChange,
  isLoading = false,
  showNoneOption = false,
  showAllOption = false,
  size = "small",
  minWidth = 240,
  label = capitalize(VOCAB.organization.noun.singular),
}) => {
  const labelId = `label-${useId()}`;

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
        {showAllOption && <MenuItem value="all">Todas</MenuItem>}
        {organizations.map((org) => (
          <MenuItem key={org.id} value={org.id}>
            {org.name}
          </MenuItem>
        ))}
        {showNoneOption && (
          <MenuItem value="none">
            <Typography color="text.secondary" sx={{ fontStyle: "italic" }}>
              sin {VOCAB.organization.noun.singular}
            </Typography>
          </MenuItem>
        )}
      </Select>
    </FormControl>
  );
};
