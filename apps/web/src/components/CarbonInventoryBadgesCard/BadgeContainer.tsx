import { FC } from "react";
import { Box, Skeleton, Typography } from "@mui/material";
import { GetCarbonInventoryBadgesResponse } from "@repo/types";
import { BadgeRow } from "./BadgeRow";
import { NoneBadgesContainer } from "./NoneBadgesContainer";

interface BadgeContainerProps {
  isLoading: boolean;
  badges: GetCarbonInventoryBadgesResponse;
}

export const BadgeContainer: FC<BadgeContainerProps> = ({
  badges,
  isLoading,
}) => {
  if (badges.length === 0 && !isLoading) return <NoneBadgesContainer />;

  return (
    <Box className="border-grey-300 flex h-full min-h-0 w-full flex-col gap-4 rounded-xl border bg-white p-4">
      <Typography
        fontSize="1rem"
        fontWeight={600}
        color="text.primary"
        className="shrink-0"
      >
        Reconocimientos
      </Typography>

      <Box className="flex flex-col">
        {isLoading
          ? [1, 2, 3].map((i) => (
              <Box key={i} className="flex items-center gap-3 p-1">
                <Skeleton
                  variant="circular"
                  width={32}
                  height={32}
                  className="shrink-0"
                />
                <Box className="flex flex-col">
                  <Skeleton variant="rectangular" width={300} height={20} />
                </Box>
              </Box>
            ))
          : badges.map((badge, i) => (
              <BadgeRow key={`${badge.badgeType}-${i}`} item={badge} />
            ))}
      </Box>
    </Box>
  );
};
