import { Box, Button, CircularProgress, Typography } from "@mui/material";
import { AuthenticationLayout } from "@/components/layout";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "@tanstack/react-router";
import { useUserStore } from "@/stores/userStore";
import { Routes } from "@/interfaces";

export const SignInScreen = () => {
  const navigate = useNavigate();
  const { signInRedirect, isLoading, account } = useAuth();
  const { user: me } = useUserStore();

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (me || account) {
    void navigate({ to: Routes.HOME });
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
      </Box>
    </AuthenticationLayout>
  );
};
