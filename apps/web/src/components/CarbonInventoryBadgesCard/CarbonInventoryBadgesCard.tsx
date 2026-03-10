import { FC, useEffect } from "react";
import { useSnackbar } from "notistack";
import { useCarbonInventoryBadges } from "@/api/query";
import { BadgeContainer } from "./BadgeContainer";

interface Props {
  inventoryId: string;
}

export const CarbonInventoryBadgesCard: FC<Props> = ({ inventoryId }) => {
  const { enqueueSnackbar } = useSnackbar();
  const {
    data: badges = [],
    isLoading,
    error,
  } = useCarbonInventoryBadges(inventoryId);

  useEffect(() => {
    if (error) {
      enqueueSnackbar("No se pudieron cargar los sellos del inventario", {
        variant: "error",
        preventDuplicate: true,
      });
    }
  }, [error, enqueueSnackbar]);

  return <BadgeContainer badges={badges} isLoading={isLoading} />;
};
