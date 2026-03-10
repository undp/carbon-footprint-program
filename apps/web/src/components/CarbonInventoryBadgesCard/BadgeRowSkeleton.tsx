import { Box, Skeleton } from "@mui/material";
import { FC } from "react";

export const BadgeRowSkeleton: FC = () => {
  return (
    <Box className="flex items-center gap-3 p-1">
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
  );
};
