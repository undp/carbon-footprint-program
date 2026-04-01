import { Box, CircularProgress } from "@mui/material";

// TODO: we could improve the design of this component
export const RouteLoadingFallback = () => (
  <Box
    display="flex"
    justifyContent="center"
    alignItems="center"
    minHeight="100vh"
  >
    <CircularProgress />
  </Box>
);
