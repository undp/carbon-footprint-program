import { FC, ReactNode } from "react";
import { Box, Button, Typography } from "@mui/material";
import type { ButtonProps } from "@mui/material";
import { HuellaLatamLogo } from "@/icons";
import { ArrowRightAltRounded } from "@mui/icons-material";
import { Routes } from "@/interfaces/routes";
import { useNavigate } from "@tanstack/react-router";

// Componente para el header reutilizable
interface FootprintCalculatorHeaderProps {
  title?: string;
}

export const FootprintCalculatorHeader: FC<FootprintCalculatorHeaderProps> = ({
  title = "Inventario Organizacional",
}) => {
  const navigate = useNavigate();

  return (
    <Box
      className="flex flex-row justify-start px-6 py-4 items-center gap-6 h-20 bg-white"
      sx={{
        boxShadow: "0px 4px 8px rgba(0,0,0,0.04)",
      }}
    >
      <Box
        className="cursor-pointer"
        onClick={() => {
          void navigate({ to: Routes.HOME as string });
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
    </Box>
  );
};

// Componente para el footer reutilizable
interface FootprintCalculatorFooterProps {
  backText?: string;
  nextText?: string;
  showBack?: boolean;
  backButtonProps?: Partial<ButtonProps>;
  nextButtonProps?: Partial<ButtonProps>;
}

export const FootprintCalculatorFooter: FC<FootprintCalculatorFooterProps> = ({
  backText = "Volver",
  nextText = "Siguiente",
  showBack = true,
  backButtonProps = {},
  nextButtonProps = {},
}) => {
  return (
    <Box
      className="fixed bottom-0 left-0 right-0 flex flex-row justify-end items-center gap-6 h-20 px-4 py-6 bg-white"
      sx={{
        boxShadow: "4px 0 8px 0 rgba(0, 0, 0, 0.04)",
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
    </Box>
  );
};

// Layout principal que combina todo
interface FootprintCalculatorLayoutProps {
  children: ReactNode;
  headerProps?: FootprintCalculatorHeaderProps;
  footerProps?: FootprintCalculatorFooterProps;
}

export const FootprintCalculatorLayout: FC<FootprintCalculatorLayoutProps> = ({
  children,
  headerProps,
  footerProps,
}) => {
  return (
    <Box className="flex flex-col min-h-screen">
      <FootprintCalculatorHeader {...headerProps} />

      {/* Content */}
      {children}

      <FootprintCalculatorFooter {...footerProps} />
    </Box>
  );
};
