import { FC } from "react";
import { useWatch, useFormState, useFormContext } from "react-hook-form";
import { TextField, MenuItem, Typography, Tooltip } from "@mui/material";
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
      <TextField
        select
        fullWidth
        size="small"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        error={!!fieldError}
        sx={{
          "& .MuiOutlinedInput-root": {
            backgroundColor: "white",
          },
          justifyContent: "center",
        }}
      >
        {NORMATIVA_OPTIONS.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </TextField>
    </Tooltip>
  );
};
