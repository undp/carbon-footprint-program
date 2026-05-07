import { FC } from "react";
import { Box, FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import { GetAllMethodologiesResponse } from "@repo/types";
import { MethodologyStatusChip } from "./MethodologyStatusChip";

interface Props {
  methodologies: GetAllMethodologiesResponse;
  value: string | undefined;
  onChange: (id: string) => void;
  disabled?: boolean;
  minWidth?: number;
  label?: string;
}

const LABEL_ID = "methodology-select-label";

export const MethodologySelector: FC<Props> = ({
  methodologies,
  value,
  onChange,
  disabled,
  minWidth = 280,
  label = "Metodología",
}) => {
  const selectedMethodology = methodologies.find((m) => m.id === value);

  return (
    <FormControl sx={{ minHeight: 40, minWidth }} size="small">
      <InputLabel id={LABEL_ID}>{label}</InputLabel>
      <Select
        labelId={LABEL_ID}
        label={label}
        value={value ?? ""}
        disabled={disabled || methodologies.length === 0}
        onChange={(e) => onChange(e.target.value)}
        renderValue={() =>
          selectedMethodology ? (
            <Box className="flex items-center gap-2">
              <span>{selectedMethodology.name}</span>
              <MethodologyStatusChip status={selectedMethodology.status} />
            </Box>
          ) : null
        }
      >
        {methodologies.map((m) => (
          <MenuItem key={m.id} value={m.id}>
            <Box className="flex w-full items-center justify-between gap-2">
              <span>{m.name}</span>
              <MethodologyStatusChip status={m.status} />
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
