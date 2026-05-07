import { FC, useCallback } from "react";
import { ArrowRightAltRounded } from "@mui/icons-material";
import {
  Card,
  CardHeader,
  Avatar,
  CardContent,
  Typography,
  CardActions,
  Button,
  useTheme,
  alpha,
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
  backgroundColor?: string;
  textColor?: string;
  iconColor?: string;
}

export const CreateInventoryCard: FC<Props> = ({
  AvatarIcon,
  title,
  description,
  buttonText,
  usageMode,
  organizationId,
  backgroundColor,
  textColor,
  iconColor,
}) => {
  const theme = useTheme();
  const bgColor = alpha(backgroundColor ?? theme.palette.common.white, 0.1);
  const txtColor = textColor ?? theme.palette.common.white;
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const createInventory = useCreateCarbonInventory();

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
      sx={{
        background: bgColor,
        borderRadius: 5,
        maxWidth: 364,
        p: 2,
      }}
      elevation={0}
    >
      <CardHeader
        avatar={
          <Avatar
            sx={{
              background: bgColor,
              width: 56,
              height: 56,
            }}
          >
            <AvatarIcon
              sx={{
                color: iconColor ?? theme.palette.common.white,
              }}
            />
          </Avatar>
        }
      />
      <CardContent sx={{ padding: "8px", height: 152 }}>
        <Typography variant="subtitle1" fontWeight="600" color={txtColor}>
          {title}
        </Typography>
        <Typography variant="subtitle1" color={txtColor} sx={{ mt: 1 }}>
          {description}
        </Typography>
      </CardContent>
      <CardActions className="flex-row-reverse">
        <Button
          sx={{ backgroundColor: theme.palette.common.deepForest }}
          variant="contained"
          endIcon={<ArrowRightAltRounded />}
          onClick={() => void handleNavigate()}
          disabled={createInventory.isPending}
          loading={createInventory.isPending}
        >
          {buttonText}
        </Button>
      </CardActions>
    </Card>
  );
};
