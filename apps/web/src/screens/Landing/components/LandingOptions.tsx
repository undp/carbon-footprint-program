import { FC, useCallback } from "react";
import { Box, Typography, useTheme } from "@mui/material";
import { useNavigate } from "@tanstack/react-router";
import { useSnackbar } from "notistack";
import { useCreateCarbonInventory } from "@/api/query";
import { useAuth } from "@/contexts";
import { ApplicationFormIcon, CalculatorIcon } from "@/icons";
import { Routes } from "@/interfaces";
import { LANDING_COPY } from "../constants";
import { LandingOptionCard } from "./LandingOptionCard";

/**
 * The landing's action column: the two ways to start a footprint.
 *
 * "Conoce tu Huella" opens an anonymous draft and drops the visitor straight
 * into the calculator; "Gestiona tu Huella" hands them to the identity
 * provider, because everything it promises —stored data, reports and the
 * recognitions pilot— needs an account behind it.
 */
export const LandingOptions: FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { signInRedirect } = useAuth();
  const createInventory = useCreateCarbonInventory();

  const handleExplore = useCallback(async () => {
    try {
      const created = await createInventory.mutateAsync({
        usageMode: "SIMPLIFIED",
        organizationId: null,
      });

      void navigate({
        to: Routes.CARBON_INVENTORY_BUSINESS_PROFILING,
        params: { inventoryId: created.id },
      });
    } catch {
      enqueueSnackbar("No se pudo crear la huella", { variant: "error" });
    }
  }, [createInventory, navigate, enqueueSnackbar]);

  return (
    <Box className="flex flex-col gap-5">
      <Typography
        component="p"
        sx={{
          fontSize: 13,
          fontWeight: "fontWeightBold",
          letterSpacing: "2.3px",
          textTransform: "uppercase",
          color: theme.palette.common.white,
        }}
      >
        {LANDING_COPY.optionsHeading}
      </Typography>
      <LandingOptionCard
        AvatarIcon={CalculatorIcon}
        tone="glass"
        title={LANDING_COPY.explore.title}
        description={LANDING_COPY.explore.description}
        actionText={LANDING_COPY.explore.action}
        isBusy={createInventory.isPending}
        onAction={() => void handleExplore()}
      />
      <LandingOptionCard
        AvatarIcon={ApplicationFormIcon}
        tone="solid"
        title={LANDING_COPY.manage.title}
        description={LANDING_COPY.manage.description}
        actionText={LANDING_COPY.manage.action}
        helperText={LANDING_COPY.manage.helper}
        onAction={() => void signInRedirect(Routes.HOME)}
      />
    </Box>
  );
};
