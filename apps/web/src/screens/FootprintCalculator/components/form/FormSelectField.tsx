import { useMemo } from "react";
import {
  FormControl,
  FormHelperText,
  InputLabel,
  MenuItem,
  Select,
  SelectProps,
} from "@mui/material";
import { Control, Controller, FieldPath, FieldValues } from "react-hook-form";

type Option = { label: string; value: string | number };

type Props<T extends FieldValues> = {
  name: FieldPath<T>;
  control: Control<T>;
  label: string;
  labelId?: string;
  options: Option[];
  required?: boolean;
  helperText?: string;
  fullWidth?: boolean;
} & Omit<SelectProps, "name" | "label" | "labelId" | "value" | "onChange">;

export const FormSelectField = <T extends FieldValues>({
  name,
  control,
  label,
  labelId,
  options,
  required,
  helperText,
  fullWidth = true,
  ...selectProps
}: Props<T>) => {
  const computedLabelId = useMemo(
    () => labelId ?? `${name}-label`,
    [labelId, name]
  );

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <FormControl
          fullWidth={fullWidth}
          required={required}
          error={!!fieldState.error}
        >
          <InputLabel id={computedLabelId}>{label}</InputLabel>
          <Select
            {...field}
            labelId={computedLabelId}
            label={label}
            {...selectProps}
          >
            {options.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
          {(fieldState.error?.message || helperText) && (
            <FormHelperText>
              {fieldState.error?.message ?? helperText}
            </FormHelperText>
          )}
        </FormControl>
      )}
    />
  );
};
