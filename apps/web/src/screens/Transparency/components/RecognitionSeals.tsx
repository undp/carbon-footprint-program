import { FC } from "react";
import { Box, Tooltip } from "@mui/material";
import type { TransparencyCompany } from "@repo/types";
import sealMedicion from "@/assets/seals/MEDICION.svg";
import sealVerificacion from "@/assets/seals/VERIFICACION.svg";
import sealReduccion from "@/assets/seals/REDUCCION.svg";

interface RecognitionSealsProps {
  recognitions: TransparencyCompany["recognitions"];
  size?: number;
}

const SEAL_CONFIG = [
  {
    key: "measurement" as const,
    label: "Diploma Medición",
    tooltip:
      "Diploma Medición — La empresa ha medido su huella de carbono organizacional",
    image: sealMedicion,
  },
  {
    key: "verification" as const,
    label: "Sello Verificación",
    tooltip:
      "Sello Verificación — La empresa ha verificado su huella de carbono",
    image: sealVerificacion,
  },
  {
    key: "reduction" as const,
    label: "Sello Reducción",
    tooltip: "Sello Reducción — La empresa ha reducido su huella de carbono",
    image: sealReduccion,
  },
];

export const RecognitionSeals: FC<RecognitionSealsProps> = ({
  recognitions,
  size = 32,
}) => {
  return (
    <Box className="flex items-center gap-2">
      {SEAL_CONFIG.map((seal) => {
        const isGranted = recognitions[seal.key];
        if (!isGranted) return null;

        return (
          <Tooltip key={seal.key} title={seal.tooltip} arrow placement="top">
            <Box
              component="img"
              src={seal.image}
              alt={seal.label}
              sx={{
                width: size,
                height: size,
                flexShrink: 0,
                cursor: "default",
              }}
            />
          </Tooltip>
        );
      })}
    </Box>
  );
};
