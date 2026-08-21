import { FC } from "react";
import { Box, Typography, useTheme } from "@mui/material";
import { ApplicationFormIcon, CalculatorIcon } from "@/icons";
import { CreateInventoryCard } from "@/components/CreateInventoryCard";

/** The landing's action column: the two ways to start a footprint. */
export const CreateInventoryOptions: FC = () => {
  const theme = useTheme();

  return (
    <Box className="flex flex-col gap-5">
      <Typography
        component="p"
        sx={{
          fontSize: 12,
          fontWeight: "fontWeightBold",
          letterSpacing: "1.6px",
          textTransform: "uppercase",
          color: theme.palette.common.white,
        }}
      >
        Elige cómo empezar
      </Typography>
      <CreateInventoryCard
        AvatarIcon={CalculatorIcon}
        title="Quiero calcular mi huella"
        description="Simula tus emisiones con fuentes relevantes de tu sector, sin guardar datos."
        buttonText="Usar calculadora"
        usageMode="SIMPLIFIED"
      />
      <CreateInventoryCard
        AvatarIcon={ApplicationFormIcon}
        title="Ya tengo mis cálculos"
        description="Sube tus datos y genera reportes en segundos."
        buttonText="Subir emisiones"
        usageMode="EXPERT"
      />
    </Box>
  );
};
