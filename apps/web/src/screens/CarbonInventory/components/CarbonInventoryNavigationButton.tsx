import { FC } from "react";
import { Button } from "@mui/material";
import { ArrowForwardRounded, HomeOutlined } from "@mui/icons-material";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts";
import { Routes } from "@/interfaces";

export const CarbonInventoryNavigationButton: FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleGoToInventories = () => {
    void navigate({ to: Routes.CARBON_INVENTORIES });
  };

  const handleGoToLanding = () => {
    void navigate({ to: Routes.LANDING });
  };

  return (
    <>
      {user && (
        <Button
          variant="outlined"
          startIcon={<ArrowForwardRounded />}
          onClick={handleGoToInventories}
        >
          Ir a mis huellas
        </Button>
      )}
      {!user && (
        <Button
          variant="outlined"
          startIcon={<HomeOutlined />}
          onClick={handleGoToLanding}
        >
          Ir al inicio
        </Button>
      )}
    </>
  );
};
