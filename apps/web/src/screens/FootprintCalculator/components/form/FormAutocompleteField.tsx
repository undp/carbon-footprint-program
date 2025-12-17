import { useMemo } from "react";
import {
  Autocomplete,
  AutocompleteProps,
  FormHelperText,
  TextField,
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
} & Omit<
  AutocompleteProps<Option, false, false, false>,
  "name" | "options" | "value" | "onChange" | "renderInput"
>;

export const FormAutocompleteField = <T extends FieldValues>({
  name,
  control,
  label,
  labelId,
  options,
  required,
  helperText,
  fullWidth = true,
  ...autocompleteProps
}: Props<T>) => {
  const computedLabelId = useMemo(
    () => labelId ?? `${name}-label`,
    [labelId, name]
  );

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => {
        const selectedOption =
          options.find((option) => option.value === field.value) || null;

        return (
          <>
            <Autocomplete<Option, false, false, false>
              {...autocompleteProps}
              fullWidth={fullWidth}
              options={options}
              value={selectedOption}
              onChange={(_, newValue) => {
                field.onChange(newValue?.value ?? "");
              }}
              getOptionLabel={(option) => option.label}
              isOptionEqualToValue={(option, value) =>
                option.value === value.value
              }
              noOptionsText="No encontrado"
              renderInput={(params) => (
                <TextField
                  {...params}
                  label={label}
                  required={required}
                  error={!!fieldState.error}
                  inputProps={{
                    ...params.inputProps,
                    id: computedLabelId,
                  }}
                />
              )}
            />
            {(fieldState.error?.message || helperText) && (
              <FormHelperText error={!!fieldState.error}>
                {fieldState.error?.message ?? helperText}
              </FormHelperText>
            )}
          </>
        );
      }}
    />
  );
};
