import { FC, ReactNode, memo } from "react";
import { Box, Button, Typography } from "@mui/material";
import { Edit } from "@mui/icons-material";

type InfoCardProps = {
  title: string | null;
  children: ReactNode;
  onEdit?: () => void;
};

const InfoCardComponent: FC<InfoCardProps> = ({ title, children, onEdit }) => {
  return (
    <Box className="bg-background relative flex flex-col gap-4 rounded p-4">
      <Typography variant="body1" fontWeight={500} fontSize={18}>
        {title}
      </Typography>
      <Box className="flex flex-col">{children}</Box>
      {onEdit && (
        <Box className="absolute top-2 right-4">
          <Button
            variant="outlined"
            color="primary"
            startIcon={<Edit />}
            onClick={onEdit}
            sx={{ minWidth: 100, height: 40 }}
          >
            EDITAR
          </Button>
        </Box>
      )}
    </Box>
  );
};

export const InfoCard = memo(InfoCardComponent);
