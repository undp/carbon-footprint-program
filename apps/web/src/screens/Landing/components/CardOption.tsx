import { FC, useCallback, useState } from "react";
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
  const [loading, setLoading] = useState(false);

  const handleNavigate = useCallback(async () => {
    try {
      setLoading(true);
      await new Promise((resolve) => setTimeout(resolve, 4000));
      setLoading(false);

      const created = await createInventory.mutateAsync({
        year: new Date().getFullYear(),
        usageMode,
      });

      void navigate({
        to: Routes.CARBON_INVENTORY_BUSINESS_PROFILING as string,
        params: { inventoryId: created.id },
      });
    } catch {
      enqueueSnackbar("No se pudo crear el inventario", { variant: "error" });
    }
    return;
  }, [usageMode, createInventory, navigate, enqueueSnackbar]);

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
          disabled={loading || createInventory.isPending}
          loading={loading || createInventory.isPending}
        >
          {buttonText}
        </Button>
      </CardActions>
    </Card>
  );
};
