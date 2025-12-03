import { Box, Typography } from "@mui/material";
import React, { useMemo } from "react";
import { CalculatorIcon, ApplicationFormIcon } from "@icons";
import { CardOption } from "./CardOption";

export const Options: React.FC = () => {
  const options = useMemo(
    () => [
      {
        avatar: <CalculatorIcon />,
        title: "Quiero calcular mi huella",
        description:
          "Simula calculando tus emisiones con fuentes relevantes de tu rubro, sin guardar datos.",
        buttonText: "USAR CALCULADORA",
        onButtonClick: () => {},
      },
      {
        avatar: <ApplicationFormIcon />,
        title: "Ya tengo mis cálculos",
        description: "Sube tus datos y genera reportes en segundos.",
        buttonText: "SUBIR EMISIONES",
        onButtonClick: () => {},
      },
    ],
    []
  );

  return (
    <Box className="flex flex-col gap-4 items-center justify-center">
      <Typography variant="h5" fontWeight="600" color="white">
        Elige cómo empezar
      </Typography>
      <Box className="flex gap-10">
        {options.map((option, index) => (
          <CardOption key={index} {...option} />
        ))}
      </Box>
    </Box>
  );
};
