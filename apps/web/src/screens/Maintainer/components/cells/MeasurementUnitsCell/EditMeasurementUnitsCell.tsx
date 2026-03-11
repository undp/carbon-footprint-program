import { FC, RefObject } from "react";
import { Autocomplete, Chip, TextField, alpha } from "@mui/material";
import type { MeasurementUnit } from "../../../types";

const MAX_EDIT_CHIPS = 3;

interface EditMeasurementUnitsCellProps {
  allUnits: MeasurementUnit[];
  selectedUnits: MeasurementUnit[];
  hasError: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onChange: (unitIds: string[]) => void;
}

export const EditMeasurementUnitsCell: FC<EditMeasurementUnitsCellProps> = ({
  allUnits,
  selectedUnits,
  hasError,
  inputRef,
  onChange,
}) => {
  return (
    <Autocomplete<MeasurementUnit, true>
      multiple
      fullWidth
      size="small"
      options={allUnits}
      value={selectedUnits}
      onChange={(_, newValue) => onChange(newValue.map((u) => u.id))}
      getOptionLabel={(opt) => opt.name}
      isOptionEqualToValue={(opt, val) => opt.id === val.id}
      disableCloseOnSelect
      openOnFocus
      noOptionsText="Sin resultados"
      renderValue={(values, getItemProps) => {
        const visible = values.slice(0, MAX_EDIT_CHIPS);
        const remaining = values.length - MAX_EDIT_CHIPS;
        return [
          ...visible.map((unit, index) => {
            const { key, ...itemProps } = getItemProps({ index });
            return (
              <Chip
                key={key}
                label={unit.name}
                size="small"
                variant="outlined"
                color="primary"
                sx={{
                  backgroundColor: (t) => alpha(t.palette.primary.main, 0.1),
                }}
                {...itemProps}
              />
            );
          }),
          ...(remaining > 0
            ? [
                <Chip
                  key="__more"
                  label={`+${remaining}`}
                  size="small"
                  variant="outlined"
                  color="primary"
                  sx={{
                    backgroundColor: (t) => alpha(t.palette.primary.main, 0.1),
                  }}
                />,
              ]
            : []),
        ];
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          inputRef={inputRef}
          error={hasError}
          placeholder="Buscar unidad..."
          onKeyDown={(e) => e.stopPropagation()}
          sx={{
            "& .MuiOutlinedInput-root": {
              backgroundColor: "white",
            },
          }}
        />
      )}
      slotProps={{
        popper: {
          style: { minWidth: 280 },
          placement: "bottom-start" as const,
          modifiers: [
            {
              name: "flip",
              enabled: false,
            },
          ],
        },
      }}
      sx={{
        alignSelf: "center",
        width: "100%",
        "& .MuiAutocomplete-inputRoot": {
          py: 0,
        },
      }}
    />
  );
};
