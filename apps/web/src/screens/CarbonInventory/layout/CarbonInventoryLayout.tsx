import { FC, ReactNode } from "react";
import {
  AppBar,
  Box,
  Button,
  CircularProgress,
  Toolbar,
  Typography,
} from "@mui/material";
import type { ButtonProps } from "@mui/material";
import { HuellaLatamLogo } from "@/icons";
import { ArrowRightAltRounded } from "@mui/icons-material";
import { Routes } from "@/interfaces/routes";
import { useNavigate } from "@tanstack/react-router";

interface CarbonInventoryHeaderProps {
  title?: string;
}

export const CarbonInventoryHeader: FC<CarbonInventoryHeaderProps> = ({
  title = "Inventario Organizacional",
}) => {
  const navigate = useNavigate();

  return (
    <AppBar
      position="sticky"
      color="default"
      elevation={0}
      className="top-0 right-0 left-0"
      sx={{ boxShadow: "0px 4px 8px rgba(0,0,0,0.04)" }}
    >
      <Toolbar
        disableGutters
        className="flex h-20 flex-row items-center justify-start gap-6 bg-white px-6 py-4"
      >
        <Box
          className="flex cursor-pointer items-center"
          onClick={() => {
            void navigate({ to: Routes.HOME });
          }}
        >
          <HuellaLatamLogo
            sx={{
              width: 117,
              height: 50,
            }}
          />
        </Box>
        <Typography variant="body1">{title}</Typography>
      </Toolbar>
    </AppBar>
  );
};

interface CarbonInventoryFooterProps {
  backText?: string;
  nextText?: string;
  showBack?: boolean;
  backButtonProps?: Partial<ButtonProps>;
  nextButtonProps?: Partial<ButtonProps>;
}

export const CarbonInventoryFooter: FC<CarbonInventoryFooterProps> = ({
  backText = "Volver",
  nextText = "Siguiente",
  showBack = true,
  backButtonProps = {},
  nextButtonProps = {},
}) => {
  return (
    <AppBar
      position="sticky"
      color="default"
      elevation={0}
      className="top-auto bottom-0"
    >
      <Toolbar
        className="flex h-20 flex-row items-center justify-end gap-6 bg-white px-4 py-4"
        sx={{ boxShadow: "4px 0 8px 0 rgba(0, 0, 0, 0.04)" }}
      >
        <Box className="flex flex-row gap-6">
          {showBack && (
            <Button
              startIcon={<ArrowRightAltRounded className="-scale-x-100" />}
              {...backButtonProps}
            >
              {backText}
            </Button>
          )}
          <Button
            variant="contained"
            endIcon={<ArrowRightAltRounded />}
            {...nextButtonProps}
          >
            {nextText}
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

interface CarbonInventoryLayoutProps {
  children: ReactNode;
  headerProps?: CarbonInventoryHeaderProps;
  footerProps?: CarbonInventoryFooterProps;
  isLoading?: boolean;
  hasError?: boolean;
  errorMessage?: {
    title?: string;
    description?: string;
    retryButtonText?: string;
  };
  onRetry?: () => void;
  onError?: () => void;
}

export const CarbonInventoryLayout: FC<CarbonInventoryLayoutProps> = ({
  children,
  headerProps,
  footerProps,
  isLoading = false,
  hasError = false,
  errorMessage = {
    title: "Hubo un error cargando la información",
    description:
      "Por favor, pruebe a recargar la página nuevamente o intente más tarde.",
    retryButtonText: "Recargar Página",
  },
  onRetry,
  onError,
}) => {
  // Si hay error, ejecutar onError callback
  if (hasError && onError) {
    onError();
  }

  return (
    <Box className="flex h-screen flex-col">
      <CarbonInventoryHeader {...headerProps} />
      <Box className="flex min-h-0 flex-1 flex-col p-6">
        {isLoading && (
          <Box className="flex min-h-0 flex-1 items-center justify-center">
            <CircularProgress />
          </Box>
        )}

        {!isLoading && hasError && (
          <Box className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <Typography variant="h5" color="text.primary" fontWeight="bold">
              {errorMessage.title}
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{ maxWidth: 600 }}
            >
              {errorMessage.description}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              onClick={onRetry || (() => window.location.reload())}
              sx={{ mt: 2 }}
            >
              {errorMessage.retryButtonText}
            </Button>
          </Box>
        )}

        {!isLoading && !hasError && children}
      </Box>
      <CarbonInventoryFooter {...footerProps} />
    </Box>
  );
};
