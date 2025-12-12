import { FC, ReactNode } from "react";
import { Box, Button, Typography, useTheme } from "@mui/material";
import { HuellaLatamLogo } from "@/icons";
import { ArrowRightAltRounded } from "@mui/icons-material";
import { useNavigate } from "@tanstack/react-router";

// Componente para el header reutilizable
interface FootprintCalculatorHeaderProps {
  title?: string;
}

export const FootprintCalculatorHeader: FC<FootprintCalculatorHeaderProps> = ({
  title = "Inventario Organizacional",
}) => {
  return (
    <Box
      className="flex flex-row justify-start px-6 py-4 items-center gap-6 h-20 bg-white"
      sx={{
        boxShadow: "0px 4px 8px rgba(0,0,0,0.04)",
      }}
    >
      <HuellaLatamLogo
        sx={{
          width: 117,
          height: 50,
        }}
      />
      <Typography variant="body1">{title}</Typography>
    </Box>
  );
};

// Componente para el footer reutilizable
interface FootprintCalculatorFooterProps {
  backText?: string;
  nextText?: string;
  backRoute?: string;
  nextRoute?: string;
  onBack?: () => void;
  onNext?: () => void;
  showBack?: boolean;
  backDisabled?: boolean;
  nextDisabled?: boolean;
}

export const FootprintCalculatorFooter: FC<FootprintCalculatorFooterProps> = ({
  backText = "Volver",
  nextText = "Siguiente",
  backRoute,
  nextRoute,
  onBack,
  onNext,
  showBack = true,
  backDisabled = false,
  nextDisabled = false,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backRoute) {
      void navigate({ to: backRoute });
    }
  };

  const handleNext = () => {
    if (onNext) {
      onNext();
    } else if (nextRoute) {
      void navigate({ to: nextRoute });
    }
  };

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
            disabled={backDisabled}
            onClick={handleBack}
          >
            {backText}
          </Button>
        )}
        <Button
          sx={{ backgroundColor: theme.palette.primary.main }}
          variant="contained"
          endIcon={<ArrowRightAltRounded />}
          disabled={nextDisabled}
          onClick={handleNext}
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
