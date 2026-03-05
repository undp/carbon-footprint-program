import { FC } from "react";
import { useCarbonInventoryBadges } from "@/api/query";
import { BadgeContainer } from "./BadgeContainer";

interface Props {
  inventoryId: string;
}

export const CarbonInventoryBadgesCard: FC<Props> = ({ inventoryId }) => {
  const { data: badges = [], isLoading } =
    useCarbonInventoryBadges(inventoryId);

  return <BadgeContainer badges={badges} isLoading={isLoading} />;
};
