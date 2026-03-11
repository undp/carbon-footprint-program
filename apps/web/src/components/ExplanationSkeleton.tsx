import { Skeleton, Stack } from "@mui/material";

export function ExplanationSkeleton() {
  return (
    <Stack spacing={2}>
      <Skeleton variant="text" width="60%" height={32} />
      <Skeleton variant="text" width="100%" />
      <Skeleton variant="text" width="100%" />
      <Skeleton variant="text" width="85%" />
      <Skeleton variant="rectangular" width="100%" height={24} />
      <Skeleton variant="text" width="40%" height={28} />
      <Skeleton variant="text" width="100%" />
      <Skeleton variant="text" width="95%" />
      <Skeleton variant="text" width="70%" />
      <Skeleton variant="rectangular" width="100%" height={24} />
      <Skeleton variant="text" width="50%" height={28} />
      <Skeleton variant="text" width="100%" />
      <Skeleton variant="text" width="90%" />
      <Skeleton variant="text" width="80%" />
    </Stack>
  );
}
