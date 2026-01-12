import { FC } from "react";
import { Select, MenuItem, Tooltip } from "@mui/material";
import { CUSTOM_FACTOR_SOURCES } from "../services/emissionFactorService";

interface EmissionEditorFactorSourceCellProps {
  availableSources: string[];
  value: string | null;
  onChange: (value: string) => void;
  rowId: string | number;
  disabled?: boolean;
  disabledReason?: string | null;
}

export const EmissionEditorFactorSourceCell: FC<
  EmissionEditorFactorSourceCellProps
> = ({
  availableSources,
  value,
  onChange,
  rowId,
  disabled = false,
  disabledReason = null,
}) => {
  const selectElement = (
    <Select
      id={`factorSource_${rowId}`}
      value={value || ""}
      fullWidth
      size="small"
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      sx={{
        "& .MuiInputBase-input.Mui-disabled": {
          WebkitTextFillColor: disabled ? "rgba(0, 0, 0, 0.38)" : "inherit",
        },
      }}
    >
      {availableSources.map((source) => (
        <MenuItem key={source} value={source}>
          {source}
        </MenuItem>
      ))}
      <MenuItem value={CUSTOM_FACTOR_SOURCES.OWN_FACTOR}>
        {CUSTOM_FACTOR_SOURCES.OWN_FACTOR}
      </MenuItem>
      <MenuItem value={CUSTOM_FACTOR_SOURCES.OTHER}>
        {CUSTOM_FACTOR_SOURCES.OTHER}
      </MenuItem>
    </Select>
  );

  if (disabled && disabledReason) {
    return (
      <Tooltip title={disabledReason} arrow placement="top">
        <span>{selectElement}</span>
      </Tooltip>
    );
  }

  return selectElement;
};
