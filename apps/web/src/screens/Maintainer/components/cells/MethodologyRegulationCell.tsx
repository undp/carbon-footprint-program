import { FC } from "react";
import { useWatch, useFormState, useFormContext } from "react-hook-form";
import { Autocomplete, TextField, Typography, Tooltip } from "@mui/material";
import { NORMATIVA_OPTIONS } from "../../constants";
import type { MethodologiesFormValues } from "../../hooks/useMethodologiesForm";

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
  const value = useWatch<MethodologiesFormValues>({
    name: `methodologies.${rowIndex}.regulation`,
  }) as string;
  const { errors } = useFormState({
    control,
    name: `methodologies.${rowIndex}.regulation`,
  });
  const fieldError = errors.methodologies?.[rowIndex]?.regulation;

  if (!isEditing) {
    return (
      <Typography
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
        }}
      >
        {value}
      </Typography>
    );
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
