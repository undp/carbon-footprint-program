import { FC } from "react";
import { Box, Card, Stack, Typography } from "@mui/material";
import { InfoButton } from "@/components";
import { useExplanationDialog } from "@/contexts";

const BADGES_EXPLANATION_SLUGS = {
  MAIN: "badges",
} as const;

export const BadgesScreenHeader: FC = () => {
  const { openExplanationBySlug } = useExplanationDialog();

  return (
    <Card
      sx={{
        p: 2,
        borderRadius: "16px",
        boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)",
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <Box>
          <Box className="flex items-center gap-1">
            <Typography variant="h5" fontWeight={700}>
              Sellos
            </Typography>
            <InfoButton
              label="Más información"
              onClick={() =>
                openExplanationBySlug(BADGES_EXPLANATION_SLUGS.MAIN)
              }
            />
          </Box>
          <Typography variant="body2" color="text.secondary">
            Gestión de sellos por tipo de reconocimiento
          </Typography>
        </Box>
      </Stack>
    </Card>
  );
};
