import { FC, useEffect, useRef, useMemo } from "react";
import { useWatch, useFormState, useFormContext } from "react-hook-form";
import {
  Autocomplete,
  Box,
  Chip,
  TextField,
  Typography,
  alpha,
} from "@mui/material";
import { getNestedError } from "./cellUtils";
import type { MeasurementUnit } from "../../types";

interface MeasurementUnitsCellProps {
  formArrayName: string;
  rowIndex: number;
  isEditing: boolean;
  allUnits: MeasurementUnit[];
  onChange: (unitIds: string[]) => void;
  onClick?: () => void;
}

const MAX_VISIBLE_CHIPS = 10;
const MAX_EDIT_CHIPS = 3;

export const MeasurementUnitsCell: FC<MeasurementUnitsCellProps> = ({
  formArrayName,
  rowIndex,
  isEditing,
  allUnits,
  onChange,
  onClick,
}) => {
  const formPath = `${formArrayName}.${rowIndex}.measurementUnitIds`;
  const { control } = useFormContext();
  const rawUnitIds: unknown = useWatch({ control, name: formPath });
  const unitIds = useMemo(
    () =>
      Array.isArray(rawUnitIds)
        ? rawUnitIds.filter((id): id is string => typeof id === "string")
        : [],
    [rawUnitIds]
  );
  const { errors } = useFormState({ control, name: formPath });
  const fieldError = getNestedError(
    errors,
    formArrayName,
    rowIndex,
    "measurementUnitIds"
  );

  const selectedUnits = useMemo(
    () => allUnits.filter((u) => unitIds.includes(u.id)),
    [allUnits, unitIds]
  );

  const hasError = isEditing && !!fieldError;

  const autoOpenRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && autoOpenRef.current) {
      autoOpenRef.current = false;
      inputRef.current?.focus();
    }
  }, [isEditing]);

  const handleOpenAndEdit = () => {
    autoOpenRef.current = true;
    onClick?.();
  };

  if (!isEditing) {
    const visibleChips = selectedUnits.slice(0, MAX_VISIBLE_CHIPS);
    const remaining = selectedUnits.length - MAX_VISIBLE_CHIPS;

    return (
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 0.5,
          alignItems: "center",
          width: "100%",
          px: 0.5,
          py: 0.5,
          borderRadius: 1,
        }}
      >
        {visibleChips.map((unit) => (
          <Chip
            key={unit.id}
            label={unit.name}
            size="small"
            variant="outlined"
            color="primary"
            sx={{ backgroundColor: (t) => alpha(t.palette.primary.main, 0.1) }}
            onDelete={
              onClick
                ? () => onChange(unitIds.filter((id) => id !== unit.id))
                : undefined
            }
          />
        ))}
        {remaining > 0 && (
          <Chip
            label={`+${remaining}`}
            size="small"
            variant="outlined"
            color="primary"
            onClick={handleOpenAndEdit}
            sx={{
              backgroundColor: (t) => alpha(t.palette.primary.main, 0.1),
              cursor: onClick ? "pointer" : "default",
            }}
          />
        )}
        {selectedUnits.length === 0 && !onClick && (
          <Typography variant="body2" color="text.secondary">
            —
          </Typography>
        )}
        {onClick && (
          <Chip
            label="+ Agregar"
            size="small"
            variant="outlined"
            onClick={handleOpenAndEdit}
            sx={{
              borderStyle: "dashed",
              borderColor: "primary.main",
              color: "primary.main",
            }}
          />
        )}
      </Box>
    );
  }

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
