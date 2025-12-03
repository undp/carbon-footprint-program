import { FC } from "react";
import { alpha, Box, Container, Typography, useTheme } from "@mui/material";
import { LatamFootprintIcon } from "@icons";
import { Header } from "./components/Header";
import { Options } from "./components/Options";

export const LandingScreen: FC = () => {
  const theme = useTheme();

  const alphaDeepForest = alpha(theme.palette.common.deepForest, 0.35);

  return (
    <Box
      component="main"
      flexGrow={1}
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: `linear-gradient(0deg, ${alphaDeepForest} 0%, ${alphaDeepForest} 100%), 
        linear-gradient(293deg, ${theme.palette.common.brightGreen} 0%, ${theme.palette.secondary.main} 100%)`,
      }}
    >
      <LatamFootprintIcon
        sx={{
          width: "100%",
          height: "100%",
          position: "absolute",
          top: 0,
          left: 0,
          zIndex: 0,
        }}
      />
      <Header />
      <Container className="flex justify-center flex-col gap-12">
        <Box className="flex flex-col gap-4 items-center justify-center">
          <Typography variant="h4" color="white">
            Te damos la bienvenida a
          </Typography>
          <Typography variant="h1" fontWeight="600" color="white">
            Huella Latam
          </Typography>
          <Typography variant="h5" color="white">
            Mide, reporta y toma acción sobre tu huella de carbono
            organizacional
          </Typography>
        </Box>
        <Options />
      </Container>
    </Box>
  );
};
