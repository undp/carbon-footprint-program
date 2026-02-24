import { FC } from "react";
import { Control, Controller } from "react-hook-form";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
} from "@mui/material";
import { AddReductionProjectFormData, GreenhouseGas } from "../types";

// Lista de gases de efecto invernadero - fácil de editar
const GREENHOUSE_GASES: {
  value: GreenhouseGas;
  label: string;
}[] = [
  { value: "CO2", label: "CO2" },
  { value: "CH4", label: "CH4" },
  { value: "HIDROFLUOROCARBONADOS", label: "Hidrofluorocarbonados" },
  { value: "PERFLUOROCARBONADOS", label: "Perfluorocarbonados" },
  { value: "SF6", label: "SF6" },
  { value: "NF3", label: "NF3" },
];

// Dividir los gases en dos columnas
const GASES_COLUMN_1 = GREENHOUSE_GASES.slice(0, 3);
const GASES_COLUMN_2 = GREENHOUSE_GASES.slice(3);

type GeiConsideradosSectionProps = {
  control: Control<AddReductionProjectFormData>;
};

export const GeiConsideradosSection: FC<GeiConsideradosSectionProps> = ({
  control,
}) => {
  return (
    <Box className="flex flex-col gap-4">
      <Typography variant="body1" sx={{ fontSize: 18, color: "text.primary" }}>
        GEI Considerados
      </Typography>

      <TableContainer
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
          overflow: "hidden",
        }}
      >
        <Table>
          <TableHead>
            <TableRow
              sx={{
                bgcolor: "action.hover",
              }}
            >
              <TableCell
                sx={{
                  fontWeight: 500,
                  fontSize: 16,
                  color: "text.primary",
                  width: "50%",
                }}
              >
                GEI
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: 500,
                  fontSize: 16,
                  color: "text.primary",
                  textAlign: "center",
                }}
              >
                Selección
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: 500,
                  fontSize: 16,
                  color: "text.primary",
                  width: "50%",
                }}
              >
                GEI
              </TableCell>
              <TableCell
                sx={{
                  fontWeight: 500,
                  fontSize: 16,
                  color: "text.primary",
                  textAlign: "center",
                }}
              >
                Selección
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {GASES_COLUMN_1.map((gas1, index) => {
              const gas2 = GASES_COLUMN_2[index];
              return (
                <TableRow
                  key={gas1.value}
                  sx={{
                    "&:last-child td": { border: 0 },
                    bgcolor: "background.paper",
                  }}
                >
                  {/* First column gas */}
                  <TableCell
                    sx={{
                      fontSize: 16,
                      color: "text.primary",
                      borderBottom: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    {gas1.label}
                  </TableCell>
                  <TableCell
                    sx={{
                      textAlign: "center",
                      borderBottom: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Controller
                      name="selectedGases"
                      control={control}
                      render={({ field }) => (
                        <Checkbox
                          checked={field.value.includes(gas1.value)}
                          onChange={(e) => {
                            const newValue = e.target.checked
                              ? [...field.value, gas1.value]
                              : field.value.filter((g) => g !== gas1.value);
                            field.onChange(newValue);
                          }}
                        />
                      )}
                    />
                  </TableCell>

                  {/* Second column gas */}
                  {gas2 ? (
                    <>
                      <TableCell
                        sx={{
                          fontSize: 16,
                          color: "text.primary",
                          borderBottom: "1px solid",
                          borderColor: "divider",
                        }}
                      >
                        {gas2.label}
                      </TableCell>
                      <TableCell
                        sx={{
                          textAlign: "center",
                          borderBottom: "1px solid",
                          borderColor: "divider",
                        }}
                      >
                        <Controller
                          name="selectedGases"
                          control={control}
                          render={({ field }) => (
                            <Checkbox
                              checked={field.value.includes(gas2.value)}
                              onChange={(e) => {
                                const newValue = e.target.checked
                                  ? [...field.value, gas2.value]
                                  : field.value.filter((g) => g !== gas2.value);
                                field.onChange(newValue);
                              }}
                            />
                          )}
                        />
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell sx={{ borderBottom: "1px solid", borderColor: "divider" }} />
                      <TableCell sx={{ borderBottom: "1px solid", borderColor: "divider" }} />
                    </>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
