import { FC } from "react";
import { Box, Card, Stack, Typography } from "@mui/material";

export const BadgesScreenHeader: FC = () => (
  <Card
    sx={{
      p: 2,
      borderRadius: "16px",
      boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)",
    }}
  >
    <Stack direction="row" alignItems="center" spacing={1.5}>
      <Box>
        <Typography variant="h5" fontWeight={700}>
          Sellos
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Gestión de sellos por tipo de reconocimiento
        </Typography>
      </Box>
    </Stack>
  </Card>
);
