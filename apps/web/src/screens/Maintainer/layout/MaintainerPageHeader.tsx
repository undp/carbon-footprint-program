import { FC, ReactNode } from "react";
import { Box, Button, Paper, Typography } from "@mui/material";
import { AddOutlined } from "@mui/icons-material";
import { DownloadMenu } from "../components/DownloadMenu";

interface Props {
  title: string;
  onAddRow?: () => void;
  addLabel?: string;
  addDisabled?: boolean;
  extra?: ReactNode;
  showDownload?: boolean;
}

export const MaintainerPageHeader: FC<Props> = ({
  title,
  onAddRow,
  addLabel = "Agregar",
  addDisabled,
  extra,
  showDownload = true,
}) => (
  <Paper
    elevation={0}
    sx={{
      px: 4,
      py: 2,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      borderRadius: 2,
    }}
  >
    <Typography variant="h5" fontWeight={600}>
      {title}
    </Typography>
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
      {extra}
      {showDownload && <DownloadMenu />}
      {onAddRow && (
        <Button
          variant="contained"
          startIcon={<AddOutlined />}
          onClick={onAddRow}
          disabled={addDisabled}
          size="small"
        >
          {addLabel}
        </Button>
      )}
    </Box>
  </Paper>
);
