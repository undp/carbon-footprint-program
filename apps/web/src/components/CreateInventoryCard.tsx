import { FC, useCallback } from "react";
import { ArrowRightAltRounded } from "@mui/icons-material";
import {
  Avatar,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Typography,
  alpha,
  useTheme,
  type SvgIconProps,
} from "@mui/material";
import { useNavigate } from "@tanstack/react-router";
import { useSnackbar } from "notistack";
import { Routes } from "@/interfaces";
import { useCreateCarbonInventory } from "@/api/query";

interface Props {
  AvatarIcon: React.ComponentType<SvgIconProps>;
  title: string;
  description: string;
  buttonText: string;
  usageMode: "SIMPLIFIED" | "EXPERT";
  organizationId?: string;
}

/**
 * Entry card for calculating a footprint. Creates the draft and navigates to
 * the first step of the flow.
 *
 * It is meant to live on top of the brand gradient: a translucent glass
 * surface with dark green text.
 */
export const CreateInventoryCard: FC<Props> = ({
  AvatarIcon,
  title,
  description,
  buttonText,
  usageMode,
  organizationId,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const createInventory = useCreateCarbonInventory();

  const textColor = theme.palette.common.deepForestDark;

  const handleCreateInventory = useCallback(async () => {
    try {
      const created = await createInventory.mutateAsync({
        usageMode,
        organizationId: organizationId ?? null,
      });

      return created;
    } catch {
      enqueueSnackbar("No se pudo crear la huella", { variant: "error" });
      return null;
    }
  }, [createInventory, usageMode, organizationId, enqueueSnackbar]);

  const handleNavigate = useCallback(async () => {
    const created = await handleCreateInventory();

    if (created) {
      void navigate({
        to: Routes.CARBON_INVENTORY_BUSINESS_PROFILING,
        params: { inventoryId: created.id },
      });
    }
  }, [handleCreateInventory, navigate]);

  return (
    <Card
      elevation={0}
      sx={{
        background: `linear-gradient(150deg, ${alpha(theme.palette.common.white, 0.22)}, ${alpha(theme.palette.common.white, 0.1)})`,
        border: `1px solid ${alpha(theme.palette.common.white, 0.45)}`,
        borderRadius: 4.5,
        px: 4,
        pt: 3.75,
        pb: 3.25,
        backdropFilter: "blur(4px) saturate(1.2)",
        boxShadow: `0 10px 34px ${alpha(theme.palette.common.deepForest, 0.1)}, inset 0 1px 0 ${alpha(theme.palette.common.white, 0.45)}`,
      }}
    >
      <CardHeader
        sx={{ p: 0, mb: 2 }}
        avatar={
          <Avatar
            sx={{
              width: 46,
              height: 46,
              backgroundColor: alpha(theme.palette.common.white, 0.28),
              border: `1px solid ${alpha(theme.palette.common.white, 0.55)}`,
            }}
          >
            <AvatarIcon sx={{ color: theme.palette.common.deepForest }} />
          </Avatar>
        }
        title={
          <Typography
            variant="h6"
            component="h3"
            fontWeight="fontWeightBold"
            color={textColor}
          >
            {title}
          </Typography>
        }
      />
      <CardContent sx={{ p: 0 }}>
        <Typography variant="body1" color={textColor} sx={{ lineHeight: 1.6 }}>
          {description}
        </Typography>
      </CardContent>
      <CardActions sx={{ p: 0, mt: 2.75 }}>
        <Button
          variant="contained"
          endIcon={<ArrowRightAltRounded />}
          onClick={() => void handleNavigate()}
          disabled={createInventory.isPending}
          loading={createInventory.isPending}
          sx={{
            backgroundColor: theme.palette.common.deepForest,
            borderRadius: 1.25,
            px: 2.5,
            py: 1.375,
            fontSize: 12.5,
            letterSpacing: "1.1px",
          }}
        >
          {buttonText}
        </Button>
      </CardActions>
    </Card>
  );
};
