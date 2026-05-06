import { FC } from "react";
import { alpha, Box, Container, Typography, useTheme } from "@mui/material";
import { LatamFootprintIcon } from "@/icons";
import { Header } from "./components/Header";
import { CreateInventoryOptions } from "./components/CreateInventoryOptions";
import { VOCAB } from "@/config/vocab";

export const LandingScreen: FC = () => {
  const theme = useTheme();

  const alphaDeepForest = alpha(theme.palette.common.deepForest, 0.35);

  return (
    <Box
      component="main"
      className="flex h-screen grow flex-col"
      sx={{
        position: "relative",
        background: `linear-gradient(0deg, ${alphaDeepForest} 0%, ${alphaDeepForest} 100%), 
        linear-gradient(293deg, ${theme.palette.common.brightGreen} 0%, ${theme.palette.secondary.main} 100%)`,
      }}
    >
      <LatamFootprintIcon
        sx={{
          fill: theme.palette.common.white,
          opacity: 0.06,
          width: "100%",
          height: "100%",
          position: "absolute",
          top: 0,
          left: 0,
          zIndex: 0,
          pointerEvents: "none",
        }}
      />
      <Header />
      <Container className="flex flex-col justify-center gap-12">
        <Box className="flex flex-col items-center justify-center gap-4">
          <Typography variant="h4" color="white">
            Te damos la bienvenida a
          </Typography>
          <Typography variant="h1" fontWeight="600" color="white">
            Huella Latam
          </Typography>
          <Typography variant="h5" color="white">
            Mide, reporta y toma acción sobre tu huella de carbono{" "}
            {VOCAB.organization.relationalAdjective}
          </Typography>
        </Box>
        <CreateInventoryOptions />
      </Container>
    </Box>
  );
};
