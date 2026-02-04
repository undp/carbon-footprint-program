import { FC, ReactNode } from "react";
import { Box, Button, Typography } from "@mui/material";

type SectionCardProps = {
  title: string;
  action?: {
    label: string;
    icon?: ReactNode;
    onClick: () => void;
  };
  children: ReactNode;
};

export const SectionCard: FC<SectionCardProps> = ({
  title,
  action,
  children,
}) => {
  return (
    <Box className="flex flex-col gap-4 rounded-lg bg-white p-4">
      <Box className="flex h-10 items-center justify-between">
        <Typography variant="h6" fontWeight={600}>
          {title}
        </Typography>
        {action && (
          <Button
            variant="outlined"
            color="primary"
            startIcon={action.icon}
            onClick={action.onClick}
            sx={{ minWidth: 100, height: 40 }}
          >
            {action.label}
          </Button>
        )}
      </Box>
      {children}
    </Box>
  );
};
