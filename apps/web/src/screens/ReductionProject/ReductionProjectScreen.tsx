import { FC } from "react";
import { MainLayout } from "@/components/layout";
import { Box, Typography } from "@mui/material";

export const ReductionProjectScreen: FC = () => (
  <MainLayout>
    <Box className="flex flex-1 items-center justify-center rounded-lg bg-white p-6">
      <Typography variant="h6" color="text.secondary">
        Proyecto de Reducción (en construcción)
      </Typography>
    </Box>
  </MainLayout>
);
