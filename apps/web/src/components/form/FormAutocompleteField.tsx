import { useId, useMemo } from "react";
import {
  Autocomplete,
  AutocompleteProps,
  TextField,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { Clear as ClearIcon } from "@mui/icons-material";
import {
  Control,
  Controller,
  FieldPath,
  FieldValues,
  useWatch,
} from "react-hook-form";
import { useFuzzySearch } from "@/hooks";

type Option = { label: string; value: string | number };

type Props<T extends FieldValues> = {
  name: FieldPath<T>;
  control: Control<T>;
  label: string;
  labelId?: string;
  options: Option[];
  required?: boolean;
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
  fullWidth = true,
  ...props
}: Props<T>) => {
  const fuseOptions = useMemo(() => ({ keys: ["label"] }), []);

  const computedLabelId = useMemo(
    () => labelId ?? `${name}-label`,
    [labelId, name]
  );

  const uniqueId = useId();
  // Random-ish name to defeat Chrome's autofill heuristics, which match on
  // common field names like "sector", "company", etc.
  const antiAutofillName = `nofill-${uniqueId}-${name}`;

  const fieldValue = useWatch({ control, name });
  const selectedOption = useMemo(
    () => options.find((option) => option.value === fieldValue) || null,
    [options, fieldValue]
  );

  const { search } = useFuzzySearch<Option>(options, { fuseOptions });

  return (
    <Controller
      name={name}
      control={control}
      rules={{
        required: required ? "Este campo es obligatorio" : false,
      }}
      render={({ field, fieldState }) => {
        return (
          <Autocomplete<Option, false, false, false>
            {...props}
            fullWidth={fullWidth}
            options={options}
            filterOptions={(_, state) => search(state.inputValue)}
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
                sx={{
                  minHeight: "5rem",
                }}
                {...params}
                label={label}
                error={!!fieldState.error && !props.disabled}
                helperText={fieldState.error?.message}
                required={required}
                slotProps={{
                  htmlInput: {
                    ...params.inputProps,
                    id: computedLabelId,
                    // Prevent the browser from suggesting saved values.
                    // Chrome ignores autoComplete="off" on inputs whose label
                    // matches a known field (sector, company, etc.), so we
                    // pair a non-standard autoComplete value with a unique
                    // name attribute it cannot match against stored data.
                    name: antiAutofillName,
                    autoComplete: "new-password",
                    autoCorrect: "off",
                    spellCheck: false,
                    "data-lpignore": "true",
                    "data-form-type": "other",
                  },
                  input: {
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {params.inputProps.value && !fieldValue && (
                          <InputAdornment position="end">
                            <IconButton
                              size="small"
                              onClick={() => {
                                params.inputProps.onChange?.({
                                  target: { value: "" },
                                } as React.ChangeEvent<HTMLInputElement>);
                              }}
                              edge="end"
                            >
                              <ClearIcon fontSize="small" />
                            </IconButton>
                          </InputAdornment>
                        )}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  },
                }}
              />
            )}
          />
        );
      }}
    />
  );
};
