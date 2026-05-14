import { FC, ReactNode, useEffect } from "react";
import {
  AppBar,
  Box,
  Button,
  CircularProgress,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import type { ButtonProps } from "@mui/material";
import { BaseHeader, OverflowTooltipText } from "../../../components";
import capitalize from "lodash-es/capitalize";
import { VOCAB } from "@/config/vocab";

interface CarbonInventoryHeaderProps {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
}

export const CarbonInventoryHeader: FC<CarbonInventoryHeaderProps> = ({
  title = `Huella ${capitalize(VOCAB.organization.relationalAdjective)}`,
  subtitle,
  action,
}) => {
  return (
    <BaseHeader
      position="sticky"
      showLogo
      titleComponent={
        <Box className="flex min-w-0 flex-1 flex-row items-center gap-2">
          <Typography variant="h6" noWrap className="shrink-0">
            {title}
          </Typography>
          {subtitle && (
            <>
              <Typography color="textSecondary" variant="h6" className="shrink-0">
                •
              </Typography>
              <OverflowTooltipText
                color="textSecondary"
                variant="h6"
                className="min-w-0 flex-1"
              >
                {subtitle}
              </OverflowTooltipText>
            </>
          )}
        </Box>
      }
    >
      {action}
    </BaseHeader>
  );
};

export interface FooterButton {
  align: "left" | "right";
  text: string;
  buttonProps: Partial<ButtonProps>;
  tooltipTitle?: string;
}

interface CarbonInventoryFooterProps {
  buttons?: FooterButton[];
}

export const CarbonInventoryFooter: FC<CarbonInventoryFooterProps> = ({
  buttons = [],
}) => {
  const leftAlignedButtons = buttons.filter(
    (button) => button.align === "left"
  );
  const rightAlignedButtons = buttons.filter(
    (button) => button.align === "right"
  );

  return (
    <AppBar
      position="sticky"
      color="default"
      elevation={0}
      className="top-auto bottom-0"
    >
      <Toolbar
        className="flex h-20 flex-row items-center justify-between gap-6 bg-white px-4 py-4"
        sx={{ boxShadow: "4px 0 8px 0 rgba(0, 0, 0, 0.04)" }}
      >
        <Box className="flex flex-row gap-6">
          {leftAlignedButtons.map(
            ({ text, buttonProps, tooltipTitle }, index) => (
              <Tooltip title={tooltipTitle} key={index}>
                <span>
                  <Button {...buttonProps} key={index}>
                    {text}
                  </Button>
                </span>
              </Tooltip>
            )
          )}
        </Box>
        <Box className="flex flex-row gap-6">
          {rightAlignedButtons.map(
            ({ text, buttonProps, tooltipTitle }, index) => (
              <Tooltip title={tooltipTitle} key={index}>
                <span>
                  <Button {...buttonProps} key={index}>
                    {text}
                  </Button>
                </span>
              </Tooltip>
            )
          )}
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
  useEffect(() => {
    if (hasError && onError) {
      onError();
    }
  }, [hasError, onError]);

  return (
    <Box className="flex h-screen min-w-0 flex-col">
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
              className="max-w-[600px]"
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
