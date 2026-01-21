import { Box, Button, CircularProgress, Typography } from "@mui/material";
import { AuthenticationLayout } from "@/components/layout";
import { useAuth } from "@/contexts/AuthContext";

export const SignInScreen = () => {
  const { signInRedirect, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <AuthenticationLayout>
      <Box className="flex w-full flex-col items-center justify-center gap-6 px-10 pt-20">
        <Typography color="common.deepForest" variant="h4" fontWeight="medium">
          Inicia sesión
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={signInRedirect}
          size="large"
        >
          Iniciar Sesión
        </Button>

        <Typography
          sx={{ maxWidth: 364 }}
          variant="h6"
          textAlign="center"
          fontWeight="regular"
        >
          Ingresa tu correo electrónico. Te enviaremos un código de verificación
        </Typography>
        {/* 
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
        </Typography> */}
      </Box>
    </AuthenticationLayout>
  );
};
