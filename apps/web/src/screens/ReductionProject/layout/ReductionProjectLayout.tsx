import { FC, ReactNode, useEffect, useRef } from "react";
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
import { BaseHeader } from "@/components/layout";
import { InfoButton } from "@/components";
import { useExplanationDialog } from "@/contexts";

interface ReductionProjectHeaderProps {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  explanationSlug?: string;
}

const ReductionProjectHeader: FC<ReductionProjectHeaderProps> = ({
  title = "Proyecto de Reducción",
  subtitle,
  action,
  explanationSlug,
}) => {
  const { openExplanationBySlug } = useExplanationDialog();

  return (
    <BaseHeader
      position="sticky"
      showLogo
      titleComponent={
        <Box className="flex flex-row items-center gap-2">
          <Box className="flex items-center gap-1">
            <Typography variant="h6">{title}</Typography>
            {explanationSlug && (
              <InfoButton
                label="Más información"
                onClick={() => openExplanationBySlug(explanationSlug)}
              />
            )}
          </Box>
          {subtitle && (
            <>
              <Typography color="textSecondary" variant="h6">
                •
              </Typography>
              <Typography
                color="textSecondary"
                noWrap
                variant="h6"
                title={subtitle}
              >
                {subtitle}
              </Typography>
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

interface ReductionProjectFooterProps {
  buttons?: FooterButton[];
}

const ReductionProjectFooter: FC<ReductionProjectFooterProps> = ({
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
                  <Button {...buttonProps}>{text}</Button>
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
                  <Button {...buttonProps}>{text}</Button>
                </span>
              </Tooltip>
            )
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

interface ReductionProjectLayoutProps {
  children: ReactNode;
  headerProps?: ReductionProjectHeaderProps;
  footerProps?: ReductionProjectFooterProps;
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

export const ReductionProjectLayout: FC<ReductionProjectLayoutProps> = ({
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
  const errorReportedRef = useRef(false);

  useEffect(() => {
    if (hasError) {
      if (!errorReportedRef.current && onError) {
        onError();
        errorReportedRef.current = true;
      }
    } else {
      errorReportedRef.current = false;
    }
  }, [hasError, onError]);

  return (
    <Box className="flex h-screen flex-col">
      <ReductionProjectHeader {...headerProps} />
      <Box className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6">
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
      <ReductionProjectFooter {...footerProps} />
    </Box>
  );
};
