import { FC } from "react";
import { Control, Controller } from "react-hook-form";
import {
  Box,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Typography,
} from "@mui/material";
import { VerifyFormValues } from "../VerifyConfirmationDialog";

interface SwornDeclarationSectionProps {
  control: Control<VerifyFormValues>;
  isLoading: boolean;
}

export const SwornDeclarationSection: FC<SwornDeclarationSectionProps> = ({
  control,
  isLoading,
}) => (
  <Controller
    name="sworn"
    control={control}
    rules={{
      validate: (val) =>
        val || "Debes aceptar la declaración jurada para continuar",
    }}
    render={({ field, fieldState }) => (
      <FormControl error={!!fieldState.error}>
        <Box className="rounded border border-gray-200 bg-gray-50 p-4">
          <FormControlLabel
            sx={{ alignItems: "flex-start" }}
            control={
              <Checkbox
                checked={field.value}
                onChange={field.onChange}
                disabled={isLoading}
                sx={{
                  mt: -0.5,
                  ...(fieldState.error && {
                    color: "error.main",
                  }),
                }}
              />
            }
            label={
              <Typography variant="body2">
                Declaro bajo juramento que toda la información proporcionada en
                esta postulación es verídica y está respaldada por documentación
                oficial. Entiendo que cualquier falsedad puede resultar en
                sanciones administrativas y la anulación del reconocimiento de
                verificación.
              </Typography>
            }
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
