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
import { UsageMode as UsageModeType } from "@repo/types";

interface Props {
  AvatarIcon: React.ComponentType<SvgIconProps>;
  title: string;
  description: string;
  buttonText: string;
  usageMode: UsageModeType;
}

export const CardOption: FC<Props> = ({
  AvatarIcon,
  title,
  description,
  buttonText,
  usageMode,
}) => {
  const theme = useTheme();
  const backgroundColor = alpha(theme.palette.common.white, 0.1);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const createInventory = useCreateCarbonInventory();

  const handleCreateInventory = useCallback(async () => {
    try {
      const created = await createInventory.mutateAsync({
        usageMode,
      });

      return created;
    } catch {
      enqueueSnackbar("No se pudo crear el inventario", { variant: "error" });
      return null;
    }
  }, [createInventory, usageMode, enqueueSnackbar]);

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
        background: backgroundColor,
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
              background: backgroundColor,
              width: 56,
              height: 56,
            }}
          >
            <AvatarIcon />
          </Avatar>
        }
      />
      <CardContent sx={{ height: 152 }}>
        <Typography
          variant="subtitle1"
          fontWeight="600"
          color={theme.palette.common.white}
        >
          {title}
        </Typography>
        <Typography
          variant="subtitle1"
          color={theme.palette.common.white}
          sx={{ mt: 1 }}
        >
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
