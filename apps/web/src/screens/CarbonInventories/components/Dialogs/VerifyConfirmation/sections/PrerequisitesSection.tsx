import { FC } from "react";
import { Box, Typography } from "@mui/material";

const PREREQUISITES = [
  "Tener un cálculo de huella de carbono autodeclarado en la plataforma Huella Latam",
  "Contar con verificación externa realizada por un organismo acreditado",
  "Validar que los datos de contacto de tu organización estén actualizados en el sistema",
];

export const PrerequisitesSection: FC = () => (
  <Box className="border-b border-gray-200 pb-6">
    <Typography variant="subtitle1" fontWeight={600} className="mb-3!">
      Requisitos Previos
    </Typography>

    <Typography variant="body2" color="text.secondary" className="mb-3!">
      Antes de postular, asegúrate de cumplir con lo siguiente:
    </Typography>

    <Box component="ul" className="m-0 flex list-none flex-col gap-2 pl-0">
      {PREREQUISITES.map((item) => (
        <Box component="li" key={item}>
          <Typography variant="body2" color="text.secondary">
            • {item}
          </Typography>
        </Box>
      ))}
    </Box>
  </Box>
);
