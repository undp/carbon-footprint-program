import { FC } from "react";
import {
  Box,
  Checkbox,
  FormControlLabel,
  FormHelperText,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { Control, Controller, useWatch } from "react-hook-form";
import { FormTextField } from "@/components/form";
import type { ReductionProjectFormValues } from "../types";
import { GEI_ITEMS } from "../constants";

interface Props {
  control: Control<ReductionProjectFormValues>;
  disabled: boolean;
}

export const GeiConsideredSection: FC<Props> = ({ control, disabled }) => {
  const consideredGei = useWatch({ control, name: "consideredGei" });
  const reportedElsewhere = useWatch({ control, name: "reportedElsewhere" });

  return (
    <Box className="flex flex-row gap-6">
      {/* Left: GEI Considerados */}
      <Box className="flex-1">
        <Typography variant="body1" fontSize={18} className="mb-4">
          GEI Considerados
        </Typography>
        <TableContainer
          sx={{
            border: 1,
            borderColor: "divider",
            borderRadius: 2,
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>
                    GEI
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2" fontWeight={500}>
                    Selección
                  </Typography>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <Controller
                name="consideredGei"
                control={control}
                render={({ field, fieldState }) => (
                  <>
                    {GEI_ITEMS.map((gei) => (
                      <TableRow key={gei.value}>
                        <TableCell>
                          <Typography variant="body2">{gei.label}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Checkbox
                            checked={consideredGei.includes(gei.value)}
                            disabled={disabled}
                            onChange={(e) => {
                              const current = field.value;
                              if (e.target.checked) {
                                field.onChange([...current, gei.value]);
                              } else {
                                field.onChange(
                                  current.filter((g) => g !== gei.value)
                                );
                              }
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                    {fieldState.error && (
                      <TableRow>
                        <TableCell colSpan={2} sx={{ border: 0, pt: 0 }}>
                          <FormHelperText error role="alert">
                            {fieldState.error.message}
                          </FormHelperText>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )}
              />
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Right: Reportado en otra iniciativa */}
      <Box className="flex-1">
        <Typography variant="body1" fontSize={18} className="mb-4">
          Reportado en otra iniciativa
        </Typography>
        <Controller
          name="reportedElsewhere"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={
                <Checkbox
                  checked={field.value}
                  onChange={field.onChange}
                  disabled={disabled}
                />
              }
              label={
                <Typography variant="body2" alignSelf="center">
                  Este proyecto se ha reportado en otra iniciativa o en la meta
                  nacional como mitigación del NDC
                </Typography>
              }
              sx={{ alignItems: "flex-start", mb: 2 }}
            />
          )}
        />
        <FormTextField
          name="reportedElsewhereDescription"
          control={control}
          label="Descripción de la otra iniciativa o NDC"
          placeholder="Ingresa la descripción"
          multiline
          rows={4}
          disabled={disabled || !reportedElsewhere}
        />
      </Box>
    </Box>
  );
};
