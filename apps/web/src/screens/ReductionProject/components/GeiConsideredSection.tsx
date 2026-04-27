import { FC } from "react";
import {
  Box,
  Checkbox,
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
import { InfoButton } from "@/components";
import { useExplanationDialog } from "@/contexts";
import type { ReductionProjectFormValues } from "../formSchema";
import { GEI_ITEMS } from "../constants";

interface Props {
  control: Control<ReductionProjectFormValues>;
  disabled: boolean;
  geiExplanationSlug?: string | null;
}

export const GeiConsideredSection: FC<Props> = ({
  control,
  disabled,
  geiExplanationSlug,
}) => {
  const consideredGei = useWatch({ control, name: "consideredGei" });
  const { openExplanationBySlug } = useExplanationDialog();

  return (
    <Box className="flex-1">
      <Box className="mb-4 flex items-center gap-1">
        <Typography variant="body1" fontSize={18}>
          GEI considerados
        </Typography>
        <InfoButton
          label="Más información"
          onClick={() => openExplanationBySlug(geiExplanationSlug ?? null)}
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
  );
};
