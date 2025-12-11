import { FC } from "react";
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import { HuellaLatamLogo } from "@/icons";
import capinautPointing from "@assets/capinaut-pointing.png";
import { Controller, useForm } from "react-hook-form";
import { ArrowRightAltRounded } from "@mui/icons-material";

const YEARS = ["2020", "2021", "2022", "2023", "2024", "2025"];
const INDUSTRIES = ["Servicios", "Manufactura", "Agropecuario", "Comercio"];
const SUB_INDUSTRIES = ["Logística", "Tecnología", "Alimentos", "Retail"];
const COMPANY_SIZES = ["Micro", "Pequeña", "Mediana", "Grande"];
const ACTIVITIES = ["Producción", "Distribución", "Consumo", "Otros"];

export const BusinessProfilingScreen: FC = () => {
  const theme = useTheme();
  const { control, handleSubmit } = useForm({
    defaultValues: {
      year: "",
      companyName: "",
      sector: "",
      subSector: "",
      companySize: "",
      activity: "",
      meditionMode: "",
      quantity: "",
    },
  });
  return (
    <Box className="flex flex-col min-h-screen">
      <Box
        className="flex flex-row justify-start px-6 py-4 items-center gap-6 h-20 bg-white"
        sx={{
          boxShadow: "0px 4px 8px rgba(0,0,0,0.04)",
        }}
      >
        <HuellaLatamLogo
          sx={{
            width: 117,
            height: 50,
          }}
        />
        <Typography variant="body1">Inventario Organizacional</Typography>
      </Box>
      <Box className="flex flex-col flex-1 gap-6 p-6">
        <Box className="flex flex-col p-6 rounded-lg bg-white gap-6">
          <Box>
            <Typography variant="h6">Paso 1: Perfil de empresa</Typography>
            <Typography variant="subtitle2" color="text.secondary">
              Esta información nos ayudará a sugerir automáticamente las fuentes
              y actividades más relevantes según tu rubro.
            </Typography>
          </Box>
          <Box className="flex flex-row gap-6">
            <Box className="flex-1 flex flex-col gap-8">
              {/* ! TODO: evaluate encapsulating the form control in a component */}
              <FormControl fullWidth>
                <InputLabel id="year-label">
                  Año del inventario a calcular
                </InputLabel>

                <Controller
                  name="year"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      labelId="year-label"
                      label="Año del inventario a calcular"
                    >
                      {YEARS.map((year) => (
                        <MenuItem key={year} value={year}>
                          {year}
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                />
              </FormControl>

              <FormControl fullWidth>
                <InputLabel id="sector-label">Rubro</InputLabel>

                <Controller
                  name="sector"
                  control={control}
                  render={({ field }) => (
                    <Select {...field} labelId="sector-label" label="Rubro">
                      {INDUSTRIES.map((industry) => (
                        <MenuItem key={industry} value={industry}>
                          {industry}
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                />
              </FormControl>

              <FormControl fullWidth>
                <InputLabel id="company-size-label">Tamaño</InputLabel>

                <Controller
                  name="companySize"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      labelId="company-size-label"
                      label="Tamaño"
                    >
                      {COMPANY_SIZES.map((companySize) => (
                        <MenuItem key={companySize} value={companySize}>
                          {companySize}
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                />
              </FormControl>
            </Box>
            <Box className="flex-1 flex flex-col gap-8">
              <FormControl fullWidth>
                <Controller
                  name="companyName"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Nombre de la empresa (Opcional)"
                    />
                  )}
                />
              </FormControl>

              <FormControl fullWidth>
                <InputLabel id="sub-sector-label">Sub-rubro</InputLabel>

                <Controller
                  name="subSector"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      labelId="sub-sector-label"
                      label="Sub-rubro"
                    >
                      {SUB_INDUSTRIES.map((subIndustry) => (
                        <MenuItem key={subIndustry} value={subIndustry}>
                          {subIndustry}
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                />
              </FormControl>
            </Box>
          </Box>
        </Box>
        <Box className="flex flex-col p-6 rounded-lg bg-white gap-8">
          <Box className="flex flex-row gap-6 mt-6">
            <Box className="flex-1 flex flex-row gap-6">
              <FormControl fullWidth>
                <InputLabel id="activity-label">
                  Actividad principal del negocio
                </InputLabel>

                <Controller
                  name="activity"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      labelId="activity-label"
                      label="Actividad principal del negocio"
                    >
                      {ACTIVITIES.map((activity) => (
                        <MenuItem key={activity} value={activity}>
                          {activity}
                        </MenuItem>
                      ))}
                    </Select>
                  )}
                />
              </FormControl>

              <FormControl fullWidth>
                <Controller
                  name="quantity"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Cantidad de {activity} al año"
                    />
                  )}
                />
              </FormControl>
            </Box>
          </Box>
          <Box
            className="flex flex-row w-full h-20 p-2 bg-red-500 rounded"
            sx={{
              background: `linear-gradient(90deg, rgba(86, 245, 141, 0.20) 0%, rgba(99, 228, 207, 0.20) 100%)`,
            }}
          >
            <Box className="h-full w-10 flex items-center justify-center">
              <Box
                component="img"
                src={capinautPointing}
                alt="Actividad principal"
              />
            </Box>

            <Box>
              <Typography variant="body1" fontWeight="fontWeightBold">
                ¿Cuál es la actividad principal de tu negocio?
              </Typography>
              <Typography variant="body1">
                Es la forma más simple y representativa de medir lo que hace tu
                empresa. Te permite ver tu huella por unidad de servicio o
                producto.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Ejemplo: Actividad principal del negocio → cómo mides tu
                operación (ej: paquetes entregados). Actividad principal al año
                → cuántos hiciste el último año (ej: 220.000 paquetes).{" "}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box
        className="fixed bottom-0 left-0 right-0 flex flex-row justify-end items-center gap-6 h-20 px-4 py-6 bg-white"
        sx={{
          boxShadow: "4px 0 8px 0 rgba(0, 0, 0, 0.04)",
        }}
      >
        <Box className="flex flex-row gap-6">
          <Button
            startIcon={
              <ArrowRightAltRounded sx={{ transform: "scaleX(-1)" }} />
            }
          >
            Volver
          </Button>
          <Button
            sx={{ backgroundColor: theme.palette.primary.main }}
            variant="contained"
            endIcon={<ArrowRightAltRounded />}
          >
            Siguiente
          </Button>
        </Box>
      </Box>
    </Box>
  );
};
