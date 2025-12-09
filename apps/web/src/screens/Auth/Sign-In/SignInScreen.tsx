import { Box, Button, TextField, Typography } from "@mui/material";
import { FC } from "react";
import { Link } from "@tanstack/react-router";
import { Route as RegisterRoute } from "@/routes/auth/sign-up";
import { AuthenticationLayout } from "@/components/layout";

export const SignInScreen: FC = () => {
  return (
    <AuthenticationLayout>
      <Box className="flex flex-col pt-20 px-10 gap-6 w-full justify-center items-center">
        <Typography color="common.deepForest" variant="h4" fontWeight="medium">
          Inicia sesión
        </Typography>

        <Typography
          sx={{ maxWidth: 364 }}
          variant="h6"
          textAlign="center"
          fontWeight="regular"
        >
          Ingresa tu correo electrónico. Te enviaremos un código de verificación
        </Typography>

        <TextField
          sx={{ width: 324 }}
          label="Correo electrónico"
          variant="outlined"
        />

        <Button variant="contained" sx={{ width: 324 }}>
          Siguiente
        </Button>

        <Typography variant="subtitle1">
          ¿No tienes cuenta?{" "}
          <Typography component={Link} color="info" to={RegisterRoute.to}>
            Crear cuenta
          </Typography>
        </Typography>
      </Box>
    </AuthenticationLayout>
  );
};
