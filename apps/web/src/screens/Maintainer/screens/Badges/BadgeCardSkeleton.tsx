import { FC } from "react";
import { Card, Skeleton, Stack } from "@mui/material";

export const BadgeCardSkeleton: FC = () => (
  <Card
    sx={{
      p: 2.5,
      borderRadius: 2,
      boxShadow: "0px 2px 8px rgba(0,0,0,0.08)",
    }}
  >
    <Stack spacing={1.5}>
      <Skeleton variant="text" width="60%" height={28} />
      <Skeleton variant="rounded" width={96} height={24} />
      <Skeleton
        variant="rounded"
        width={120}
        height={120}
        sx={{ mx: "auto" }}
      />
      <Skeleton variant="text" width="80%" sx={{ mx: "auto" }} />
      <Skeleton variant="text" width="40%" sx={{ mx: "auto" }} />
    </Stack>
  </Card>
);
