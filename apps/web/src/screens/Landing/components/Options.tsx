import { FC } from "react";
import { Box, Typography } from "@mui/material";
import { CalculatorIcon, ApplicationFormIcon } from "@/icons";
import { CardOption } from "./CardOption";

export const Options: FC = () => (
  <Box className="flex flex-col items-center justify-center gap-4">
    <Typography variant="h5" fontWeight="600" color="white">
      Elige cómo empezar
    </Typography>
    <Box className="flex gap-10">
      <CardOption
        AvatarIcon={CalculatorIcon}
        title="Quiero calcular mi huella"
        description="Simula calculando tus emisiones con fuentes relevantes de tu rubro, sin guardar datos."
        buttonText="USAR CALCULADORA"
        usageMode="SIMPLIFIED"
      />
      <CardOption
        AvatarIcon={ApplicationFormIcon}
        title="Ya tengo mis cálculos"
        description="Sube tus datos y genera reportes en segundos."
        buttonText="SUBIR EMISIONES"
        usageMode="EXPERT"
      />
    </Box>
  </Box>
);
