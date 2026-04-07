import { FC } from "react";
import { alpha, darken, Box, Stack, Typography, useTheme } from "@mui/material";
import {
  InsertDriveFileOutlined,
  FileDownloadOutlined,
  Circle,
} from "@mui/icons-material";
import type { SubmissionHistoryEntry } from "@repo/types";
import { formatFileSize, formatMimeType } from "@/utils/files";

type Props = {
  files: SubmissionHistoryEntry["files"];
};

export const FilesSection: FC<Props> = ({ files }) => {
  const theme = useTheme();

  return (
    <Stack spacing={1}>
      <Typography
        variant="caption"
        fontWeight={600}
        sx={{ color: theme.palette.text.primary }}
      >
        {`Documentos adjuntos (${files.length})`}
      </Typography>

      {files.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Sin archivos adjuntos
        </Typography>
      ) : (
        <Stack spacing={1}>
          {files.map((file) => (
            <Box
              onClick={() =>
                window.open(file.previewUrl, "_blank", "noopener,noreferrer")
              }
              key={file.uuid}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                bgcolor: theme.palette.background.default,
                border: `1px solid ${darken(theme.palette.background.default, 0.1)}`,
                borderRadius: "4px",
                p: 1,
                cursor: "pointer",
                "&:hover": {
                  bgcolor: alpha(theme.palette.primary.main, 0.05),
                },
              }}
            >
              <InsertDriveFileOutlined
                sx={{ fontSize: 16, color: theme.palette.common.glossyTeal }}
              />

              <Stack sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="caption"
                  fontWeight={500}
                  noWrap
                  sx={{ color: theme.palette.text.primary }}
                >
                  {file.originalName}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: theme.palette.text.secondary }}
                >
                  {formatMimeType(file.mimeType)}{" "}
                  <Circle sx={{ fontSize: 5 }} />{" "}
                  {formatFileSize(file.sizeBytes)}
                </Typography>
              </Stack>

              <FileDownloadOutlined
                sx={{
                  color: theme.palette.common.glossyTeal,
                }}
              />
            </Box>
          ))}
        </Stack>
      )}
    </Stack>
  );
};
