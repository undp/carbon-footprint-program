import { useNavigate } from "@tanstack/react-router";
import { Routes } from "@/interfaces";
import { useCallback } from "react";

export const useCommonNavigation = () => {
  const navigate = useNavigate();

  const goToList = useCallback(() => {
    void navigate({ to: Routes.CARBON_INVENTORIES });
  }, [navigate]);

  const goToLanding = useCallback(() => {
    void navigate({ to: Routes.LANDING });
  }, [navigate]);

  return { goToList, goToLanding };
};
