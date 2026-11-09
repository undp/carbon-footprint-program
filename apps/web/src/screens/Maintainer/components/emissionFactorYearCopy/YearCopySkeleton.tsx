import { FC } from "react";
import { Box, Skeleton } from "@mui/material";

/** The copy page's layout while the factors load. */
export const YearCopySkeleton: FC = () => (
  <Box className="flex w-full flex-col gap-2" aria-busy="true">
    <Box className="flex gap-2">
      <Skeleton variant="rounded" width={120} height={40} />
      <Skeleton variant="rounded" width={120} height={40} />
    </Box>
    {Array.from({ length: 8 }, (_, index) => (
      <Skeleton key={index} variant="rounded" height={44} />
    ))}
    <Box className="flex justify-end">
      <Skeleton variant="rounded" width={220} height={36} />
    </Box>
  </Box>
);
