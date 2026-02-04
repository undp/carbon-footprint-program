import { FC } from "react";
import { useWatch, useFormState, useFormContext } from "react-hook-form";
import { Autocomplete, TextField, Typography, Tooltip } from "@mui/material";
import { NORMATIVA_OPTIONS } from "../../constants";
import type { MethodologiesFormValues } from "../../hooks/useMethodologiesForm";

interface MethodologyNormativaCellProps {
  rowIndex: number;
  isEditing: boolean;
  onChange: (value: string) => void;
}

export const MethodologyNormativaCell: FC<MethodologyNormativaCellProps> = ({
  rowIndex,
  isEditing,
  onChange,
}) => {
  const { control } = useFormContext<MethodologiesFormValues>();
  const value = useWatch<MethodologiesFormValues>({
    name: `methodologies.${rowIndex}.normativa`,
  }) as string;
  const { errors } = useFormState({
    control,
    name: `methodologies.${rowIndex}.normativa`,
  });
  const fieldError = errors.methodologies?.[rowIndex]?.normativa;

  if (!isEditing) {
    return <Typography sx={{ px: 1 }}>{value}</Typography>;
  }

  return (
    <Tooltip title={fieldError?.message ?? ""} arrow placement="top">
      <Autocomplete
        freeSolo
        fullWidth
        size="small"
        options={NORMATIVA_OPTIONS.map((option) => option.value)}
        value={value}
        onChange={(_, newValue) => onChange(newValue ?? "")}
        onInputChange={(_, newInputValue) => onChange(newInputValue)}
        sx={{
          "& .MuiAutocomplete-inputRoot": {
            py: 0,
          },
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            error={!!fieldError}
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
