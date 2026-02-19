import { FC } from "react";
import { alpha, Box, Card, Stack, Typography } from "@mui/material";
import { useAdminRequestsKpis } from "@/api/query/requests/useAdminRequestsKpis";

export const RequestScreenKpiSection: FC = () => {
  const { data: kpis } = useAdminRequestsKpis();

  return (
    <Stack direction="row" spacing={2}>
      {kpis?.map((kpi) => (
        <Card
          key={kpi.label}
          sx={{
            minHeight: "130px",
            flex: 1,
            p: 2,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            borderRadius: "12px",
            backgroundColor: alpha(kpi.color, 0.1),
            boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)",
          }}
        >
          <Box className="flex w-full justify-between">
            <Typography variant="body2" color="text.secondary">
              {kpi.label}
            </Typography>
            <Box
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              sx={{
                backgroundColor: alpha(kpi.color, 0.1),
                color: kpi.color,
              }}
            ></Box>
          </Box>
          <Typography variant="h4" fontWeight={700} sx={{ mt: 1 }}>
            {kpi.value}
          </Typography>
        </Card>
      ))}
    </Stack>
  );
};
