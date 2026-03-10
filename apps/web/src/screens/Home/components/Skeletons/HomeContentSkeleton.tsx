import { FC } from "react";
import { Box, Skeleton } from "@mui/material";

export const HomeScreenContentSkeleton: FC = () => (
  <Box className="flex min-h-0 flex-1 flex-row gap-4 rounded-lg bg-white p-6">
    <Box className="flex min-h-0 flex-3 flex-col gap-4">
      <Box className="flex min-h-0 flex-1 flex-row gap-4">
        <Box className="flex min-h-0 flex-3 flex-col gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} variant="rounded" height={56} />
          ))}
        </Box>
        <Box className="flex min-h-0 flex-1">
          <Skeleton variant="rounded" width="100%" height="100%" />
        </Box>
      </Box>
      <Box className="flex min-h-0 flex-1 flex-row gap-4">
        <Skeleton variant="rounded" sx={{ flex: 1 }} height="100%" />
        <Skeleton variant="rounded" sx={{ flex: 1 }} height="100%" />
      </Box>
    </Box>
    <Skeleton variant="rounded" sx={{ flex: 1 }} height="100%" />
  </Box>
);
