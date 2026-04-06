import { FC } from "react";
import { Box, Typography } from "@mui/material";

const PREREQUISITES = [
  "Tener un proyecto de reducción registrado en la plataforma Huella Latam",
  "Contar con una verificación externa realizada por un organismo acreditado",
  "Validar que los datos de contacto de tu organización estén actualizados en el sistema",
];

export const PrerequisitesSection: FC = () => (
  <Box className="flex flex-col gap-2">
    <Typography variant="subtitle1" fontWeight={600}>
      Requisitos Previos
    </Typography>

    <Typography variant="body2" color="text.secondary">
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
