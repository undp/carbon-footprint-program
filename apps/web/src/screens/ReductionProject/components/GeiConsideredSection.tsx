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
import { InfoButton } from "@/components";
import { useExplanationDialog } from "@/contexts";
import { REDUCTION_PROJECT_DESCRIPTION_MAX_LENGTH } from "@repo/constants";
import type { ReductionProjectFormValues } from "../types";
import { GEI_ITEMS } from "../constants";

interface Props {
  control: Control<ReductionProjectFormValues>;
  disabled: boolean;
  geiExplanationId?: string | null;
  reportedElsewhereExplanationId?: string | null;
}

export const GeiConsideredSection: FC<Props> = ({
  control,
  disabled,
  geiExplanationId,
  reportedElsewhereExplanationId,
}) => {
  const consideredGei = useWatch({ control, name: "consideredGei" });
  const reportedElsewhere = useWatch({ control, name: "reportedElsewhere" });
  const { openExplanation } = useExplanationDialog();

  return (
    <Box className="flex flex-row gap-6">
      {/* Left: GEI Considerados */}
      <Box className="flex-1">
        <Box className="mb-4 flex items-center gap-1">
          <Typography variant="body1" fontSize={18}>
            GEI Considerados
          </Typography>
          <InfoButton
            label="Más información"
            onClick={() => openExplanation(geiExplanationId ?? null)}
          />
        </Box>
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
                    Incluído
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
        <Box className="mb-4 flex items-center gap-1">
          <Typography variant="body1" fontSize={18}>
            Reportado en otra iniciativa
          </Typography>
          <InfoButton
            label="Más información"
            onClick={() =>
              openExplanation(reportedElsewhereExplanationId ?? null)
            }
          />
        </Box>
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
          slotProps={{
            htmlInput: { maxLength: REDUCTION_PROJECT_DESCRIPTION_MAX_LENGTH },
          }}
        />
      </Box>
    </Box>
  );
};
