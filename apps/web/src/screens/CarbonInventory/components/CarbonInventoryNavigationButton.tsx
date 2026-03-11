import { FC } from "react";
import { Button } from "@mui/material";
import { ArrowForwardRounded, HomeOutlined } from "@mui/icons-material";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts";
import { Routes } from "@/interfaces";

export const CarbonInventoryNavigationButton: FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleClick = () => {
    if (user) {
      void navigate({ to: Routes.CARBON_INVENTORIES });
    } else {
      void navigate({ to: Routes.LANDING });
    }
  };

  return (
    <Button
      variant="outlined"
      startIcon={user ? <ArrowForwardRounded /> : <HomeOutlined />}
      onClick={handleClick}
    >
      {user ? "Ir a mis huellas" : "Ir al inicio"}
    </Button>
  );
};
