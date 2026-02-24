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

type GeiConsideradosSectionProps = {
  control: Control<AddReductionProjectFormData>;
};

export const GeiConsideradosSection: FC<GeiConsideradosSectionProps> = ({
  control,
}) => {
  return (
    <Box className="flex flex-col gap-4">
      <Typography sx={{ fontSize: 16, color: "text.primary" }}>
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
            <TableRow sx={{ bgcolor: "background.paper" }}>
              <TableCell
                sx={{
                  fontWeight: 500,
                  fontSize: 16,
                  color: "text.primary",
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  height: 72,
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
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  height: 72,
                }}
              >
                Selección
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {GREENHOUSE_GASES.map((gas) => (
              <TableRow
                key={gas.value}
                sx={{
                  "&:last-child td": { border: 0 },
                  bgcolor: "background.paper",
                }}
              >
                <TableCell
                  sx={{
                    fontSize: 16,
                    color: "text.primary",
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    height: 56,
                    py: 0,
                  }}
                >
                  {gas.label}
                </TableCell>
                <TableCell
                  sx={{
                    textAlign: "center",
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    height: 56,
                    py: 0,
                  }}
                >
                  <Controller
                    name="selectedGases"
                    control={control}
                    render={({ field }) => (
                      <Checkbox
                        checked={field.value.includes(gas.value)}
                        onChange={(e) => {
                          const newValue = e.target.checked
                            ? [...field.value, gas.value]
                            : field.value.filter((g) => g !== gas.value);
                          field.onChange(newValue);
                        }}
                      />
                    )}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};
