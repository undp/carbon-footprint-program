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
} from "@mui/material";
import { HuellaLatamLogo } from "@/icons";
import { Controller, useForm } from "react-hook-form";
import { AddIcon } from "@/icons/AddIcon";

const YEARS = ["2020", "2021", "2022", "2023", "2024", "2025"];
const INDUSTRIES = ["Servicios", "Manufactura", "Agropecuario", "Comercio"];
const SUB_INDUSTRIES = ["Logística", "Tecnología", "Alimentos", "Retail"];
const COMPANY_SIZES = ["Micro", "Pequeña", "Mediana", "Grande"];
const ACTIVITIES = ["Producción", "Distribución", "Consumo", "Otros"];
const MEDITION_MODES = ["Sedes", "Sucursales", "Establecimientos"];

export const BusinessProfilingScreen: FC = () => {
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
    <Box className="w-full h-full">
      <Box
        className="flex flex-row justify-start items-center gap-6 h-20"
        sx={{
          padding: "16px 24px",
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

      <Box
        sx={{
          margin: "24px",
          padding: "16px",
          borderRadius: "8px",
          backgroundColor: "#FFFFFF",
        }}
      >
        <Box>
          <Typography variant="h6">Paso 1: Perfil de empresa</Typography>
          <Typography variant="subtitle2" color="text.secondary">
            Esta información nos ayudará a sugerir automáticamente las fuentes y
            actividades más relevantes según tu rubro.
          </Typography>
        </Box>
        <Box className="flex flex-row gap-6 mt-6">
          <Box className="flex-1 flex flex-col gap-6">
            {/* ! TODO: evaluate encapsulating the form control in a component */}
            <FormControl fullWidth>
              <InputLabel id="year-label" shrink>
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
                    displayEmpty
                    renderValue={(selected) =>
                      selected ? (
                        selected
                      ) : (
                        <Typography color="#41404699">
                          Selecciona un año
                        </Typography>
                      )
                    }
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
              <InputLabel id="sector-label" shrink>
                Rubro
              </InputLabel>

              <Controller
                name="sector"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    labelId="sector-label"
                    label="Rubro"
                    displayEmpty
                    renderValue={(selected) =>
                      selected ? (
                        selected
                      ) : (
                        <Typography color="#41404699">
                          Selecciona el rubro de tu empresa
                        </Typography>
                      )
                    }
                  >
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
              <InputLabel id="company-size-label" shrink>
                Tamaño
              </InputLabel>

              <Controller
                name="companySize"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    labelId="company-size-label"
                    label="Tamaño"
                    displayEmpty
                    renderValue={(selected) =>
                      selected ? (
                        selected
                      ) : (
                        <Typography color="#41404699">
                          Selecciona el tamaño de tu empresa
                        </Typography>
                      )
                    }
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
          <Box className="flex-1 flex flex-col gap-6">
            <FormControl fullWidth>
              <Controller
                name="companyName"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Nombre de la empresa (Opcional)"
                    placeholder="Indica el nombre de la empresa"
                    slotProps={{
                      inputLabel: { shrink: true },
                      htmlInput: {
                        sx: {
                          "&::placeholder": { color: "#41404699", opacity: 1 },
                        },
                      },
                    }}
                  />
                )}
              />
            </FormControl>

            <FormControl fullWidth>
              <InputLabel id="sub-sector-label" shrink>
                Sub-rubro
              </InputLabel>

              <Controller
                name="subSector"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    labelId="sub-sector-label"
                    label="Sub-rubro"
                    displayEmpty
                    renderValue={(selected) =>
                      selected ? (
                        selected
                      ) : (
                        <Typography color="#41404699">
                          Selecciona el sub-rubro de tu empresa
                        </Typography>
                      )
                    }
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
      <Box
        sx={{
          margin: "24px",
          padding: "16px",
          borderRadius: "8px",
          backgroundColor: "#FFFFFF",
        }}
      >
        <Box className="flex flex-row gap-6 mt-6">
          <Box className="flex-1 flex flex-col gap-6">
            {/* ! TODO: evaluate encapsulating the form control in a component */}
            <FormControl fullWidth>
              <InputLabel id="activity-label" shrink>
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
                    displayEmpty
                    renderValue={(selected) =>
                      selected ? (
                        selected
                      ) : (
                        <Typography color="#41404699">
                          Indica tu actividad principal
                        </Typography>
                      )
                    }
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
                    placeholder="Indica la cantidad de {activity} al año"
                    slotProps={{
                      inputLabel: { shrink: true },
                      htmlInput: {
                        sx: {
                          "&::placeholder": { color: "#41404699", opacity: 1 },
                        },
                      },
                    }}
                  />
                )}
              />
            </FormControl>
          </Box>
          <Box className="flex-1 flex flex-col gap-6">
            <FormControl fullWidth>
              <InputLabel id="medition-mode-label" shrink>
                Sedes/sucursales/establecimientos
              </InputLabel>

              <Controller
                name="meditionMode"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    labelId="medition-mode-label"
                    label="Sedes/sucursales/establecimientos"
                    displayEmpty
                    renderValue={(selected) =>
                      selected ? (
                        selected
                      ) : (
                        <Typography color="#41404699">
                          Selecciona el modo de medición
                        </Typography>
                      )
                    }
                  >
                    {MEDITION_MODES.map((meditionMode) => (
                      <MenuItem key={meditionMode} value={meditionMode}>
                        {meditionMode}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
            </FormControl>
            <Box className="flex items-center justify-center h-14">
              <Button
                variant="outlined"
                color="primary"
                startIcon={<AddIcon sx={{ width: 14, height: 14 }} />}
              >
                Agregar Sede/sucursal/establecimiento
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
