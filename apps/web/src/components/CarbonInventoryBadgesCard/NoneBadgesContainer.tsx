import { FC } from "react";
import { Box, Typography } from "@mui/material";
import { EmptyStateMessage } from "../EmissionResults";

export const NoneBadgesContainer: FC = () => {
  return (
    <Box className="flex h-full min-h-0 w-full flex-col gap-4 rounded-xl border border-gray-300 bg-white p-4">
      <Typography
        fontSize="1rem"
        fontWeight={600}
        color="text.primary"
        className="shrink-0"
      >
        Reconocimientos
      </Typography>

      <EmptyStateMessage
        message={"No hay reconocimientos asociados a esta huella de carbono."}
      />
    </Box>
  );
};
