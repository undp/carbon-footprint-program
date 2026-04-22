import { FC } from "react";
import { Box, Button, Typography } from "@mui/material";
import { BrokenImageOutlined, CloudUploadOutlined } from "@mui/icons-material";

interface InactiveBadgeCardContentProps {
  disabled: boolean;
  onUpload: () => void;
}

export const InactiveBadgeCardContent: FC<InactiveBadgeCardContentProps> = ({
  disabled,
  onUpload,
}) => (
  <Box
    sx={{
      border: "2px dashed",
      borderColor: "divider",
      borderRadius: 2,
      py: 3,
      textAlign: "center",
    }}
  >
    <BrokenImageOutlined sx={{ fontSize: 36, color: "text.disabled", mb: 1 }} />
    <Typography variant="body2" color="text.disabled" display="block" mb={1.5}>
      No hay sello activo
    </Typography>
    <Button
      variant="outlined"
      startIcon={<CloudUploadOutlined />}
      size="small"
      onClick={onUpload}
      disabled={disabled}
    >
      Subir sello
    </Button>
  </Box>
);
