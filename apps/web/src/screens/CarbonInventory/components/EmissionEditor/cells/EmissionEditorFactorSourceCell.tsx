import { FC } from "react";
import { Select, MenuItem } from "@mui/material";
import { EmissionFactor } from "@repo/types";
import { uniqBy } from "lodash-es";

interface EmissionEditorFactorSourceCellProps {
  emissionFactors: EmissionFactor[];
  value: string | null;
  onChange: (value: string) => void;
  rowId: string | number;
}

export const EmissionEditorFactorSourceCell: FC<
  EmissionEditorFactorSourceCellProps
> = ({ emissionFactors, value, onChange, rowId }) => {
  return (
    <Select
      id={`factorSource_${rowId}`}
      value={value || ""}
      fullWidth
      size="small"
      onChange={(e) => onChange(e.target.value)}
    >
      {uniqBy(emissionFactors, "source")?.map(({ source }) => (
        <MenuItem key={source} value={source ?? ""}>
          {source}
        </MenuItem>
      ))}
      <MenuItem value="Factor Propio">Factor Propio</MenuItem>
      <MenuItem value="Otro">Otro</MenuItem>
    </Select>
  );
};
