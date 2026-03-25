import { ReactNode } from "react";
import {
  Box,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormHelperText,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { Control, Controller, FieldPath, FieldValues } from "react-hook-form";

type Props<T extends FieldValues> = {
  name: FieldPath<T>;
  control: Control<T>;
  label: ReactNode;
  disabled?: boolean;
  errorMessage?: string;
};

export const FormSwornDeclarationField = <T extends FieldValues>({
  name,
  control,
  label,
  disabled,
  errorMessage = "Debes aceptar la declaración para continuar",
}: Props<T>) => {
  const theme = useTheme();

  return (
    <Controller
      name={name}
      control={control}
      rules={{ validate: (val) => val || errorMessage }}
      render={({ field, fieldState }) => (
        <FormControl error={!!fieldState.error}>
          <Box
            sx={{
              border: 1,
              borderColor: fieldState.error
                ? theme.palette.error.main
                : theme.palette.grey[200],
              borderRadius: 1,
              bgcolor: theme.palette.grey[50],
              p: 2,
            }}
          >
            <FormControlLabel
              sx={{ alignItems: "flex-start" }}
              control={
                <Checkbox
                  checked={field.value}
                  onChange={field.onChange}
                  disabled={disabled}
                  sx={{
                    mt: -0.5,
                    ...(fieldState.error && {
                      color: theme.palette.error.main,
                    }),
                  }}
                />
              }
              label={label}
            />
          </Box>
          {fieldState.error && (
            <FormHelperText role="alert">
              {fieldState.error.message}
            </FormHelperText>
          )}
        </FormControl>
      )}
    />
  );
};
