import { FC, ReactNode } from "react";
import { AppBar, Box, Button, Toolbar, Typography } from "@mui/material";
import type { ButtonProps } from "@mui/material";
import { HuellaLatamLogo } from "@/icons";
import { ArrowRightAltRounded } from "@mui/icons-material";
import { Routes } from "@/interfaces/routes";
import { useNavigate } from "@tanstack/react-router";

// Componente para el header reutilizable
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
      sx={{
        top: 0,
        left: 0,
        right: 0,
        boxShadow: "0px 4px 8px rgba(0,0,0,0.04)",
        bgcolor: "background.paper",
        zIndex: (theme) => theme.zIndex.appBar,
      }}
    >
      <Toolbar
        disableGutters
        className="flex flex-row justify-start items-center gap-6 h-20 px-6"
        sx={{
          minHeight: "80px",
          px: 6,
        }}
      >
        <Box
          className="cursor-pointer"
          onClick={() => {
            void navigate({ to: Routes.HOME as string });
          }}
          sx={{ display: "flex", alignItems: "center" }}
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

// Componente para el footer reutilizable
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
      sx={{
        top: "auto",
        bottom: 0,
        boxShadow: "4px 0 8px 0 rgba(0, 0, 0, 0.04)",
      }}
    >
      <Toolbar
        className="flex flex-row justify-end items-center gap-6"
        sx={{
          minHeight: "80px",
          px: 4,
          py: 3,
          bgcolor: "background.paper",
        }}
      >
        <Box className="flex flex-row gap-6">
          {showBack && (
            <Button
              startIcon={
                <ArrowRightAltRounded sx={{ transform: "scaleX(-1)" }} />
              }
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

// Layout principal que combina todo
interface CarbonInventoryLayoutProps {
  children: ReactNode;
  headerProps?: CarbonInventoryHeaderProps;
  footerProps?: CarbonInventoryFooterProps;
}

export const CarbonInventoryLayout: FC<CarbonInventoryLayoutProps> = ({
  children,
  headerProps,
  footerProps,
}) => {
  return (
    <Box className="flex flex-col h-screen">
      <CarbonInventoryHeader {...headerProps} />
      {/* Content */}
      <Box className="flex-1 min-h-0 flex flex-col p-6">{children}</Box>
      <CarbonInventoryFooter {...footerProps} />
    </Box>
  );
};
