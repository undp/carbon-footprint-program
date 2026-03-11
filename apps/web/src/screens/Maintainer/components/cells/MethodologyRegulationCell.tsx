import { FC, useState, useEffect } from "react";
import { useWatch, useFormState, useFormContext } from "react-hook-form";
import { Autocomplete, TextField, Typography, Tooltip } from "@mui/material";
import { NORMATIVA_OPTIONS } from "../../constants";
import type { MethodologiesFormValues } from "../../hooks/useMethodologiesForm";
import { useOverflowTooltip } from "./useOverflowTooltip";

interface MethodologyRegulationCellProps {
  rowIndex: number;
  isEditing: boolean;
  onChange: (value: string) => void;
  onClick?: () => void;
}

export const MethodologyRegulationCell: FC<MethodologyRegulationCellProps> = ({
  rowIndex,
  isEditing,
  onChange,
  onClick,
}) => {
  const { control } = useFormContext<MethodologiesFormValues>();
  const formValue = useWatch<MethodologiesFormValues>({
    name: `methodologies.${rowIndex}.regulation`,
  }) as string;
  const { errors } = useFormState({
    control,
    name: `methodologies.${rowIndex}.regulation`,
  });
  const fieldError = errors.methodologies?.[rowIndex]?.regulation;

  const [localValue, setLocalValue] = useState(formValue);

  // Sync local state when form value changes externally
  useEffect(() => {
    setLocalValue(formValue);
  }, [formValue]);

  const { isOverflowed, overflowRef } = useOverflowTooltip<HTMLElement>([
    formValue,
  ]);

  if (!isEditing) {
    return (
      <Tooltip
        title={isOverflowed ? formValue : ""}
        arrow
        placement="top"
        enterDelay={500}
      >
        <Typography
          ref={overflowRef}
          onClick={onClick}
          sx={{
            px: 1,
            py: 0.5,
            borderRadius: 1,
            cursor: onClick ? "pointer" : "default",
            transition: "background-color 0.15s ease",
            "&:hover": onClick
              ? {
                  backgroundColor: "grey.100",
                }
              : {},
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            width: "100%",
          }}
        >
          {formValue}
        </Typography>
      </Tooltip>
    );
  }

  return (
    <Tooltip title={fieldError?.message ?? ""} arrow placement="top">
      <Autocomplete
        freeSolo
        fullWidth
        size="small"
        options={NORMATIVA_OPTIONS.map((option) => option.value)}
        value={localValue}
        onChange={(_, newValue) => setLocalValue(newValue ?? "")}
        onInputChange={(_, newInputValue) => setLocalValue(newInputValue)}
        onBlur={() => onChange(localValue)}
        sx={{
          "& .MuiAutocomplete-inputRoot": {
            py: 0,
          },
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            error={!!fieldError}
            onKeyDown={(e) => e.stopPropagation()}
            sx={{
              "& .MuiOutlinedInput-root": {
                backgroundColor: "white",
              },
              minHeight: 0,
            }}
          />
        )}
      />
    </Tooltip>
  );
};
