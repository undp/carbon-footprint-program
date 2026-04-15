import { FC, useMemo } from "react";
import {
  alpha,
  darken,
  Box,
  Stack,
  Typography,
  useTheme,
  SxProps,
  Theme,
} from "@mui/material";
import {
  InsertDriveFileOutlined,
  FileDownloadOutlined,
  Circle,
} from "@mui/icons-material";
import type { SubmissionHistoryEntry } from "@repo/types";
import { formatFileSize, formatMimeType } from "@/utils/files";

type Props = {
  files: SubmissionHistoryEntry["files"];
  sx?: SxProps<Theme>;
  variant?: "recognitions" | "files";
};

export const FilesSection: FC<Props> = ({ files, sx, variant = "files" }) => {
  const theme = useTheme();

  const title = useMemo(() => {
    if (variant === "recognitions") {
      return `Reconocimientos adjuntos (${files.length})`;
    }

    return `Documentos adjuntos (${files.length})`;
  }, [files.length, variant]);

  return (
    <Stack spacing={1} sx={sx}>
      <Typography
        variant="caption"
        fontWeight={600}
        sx={{ color: theme.palette.text.primary }}
      >
        {title}
      </Typography>

      {files.length === 0 ? (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontStyle: "italic", fontSize: "0.75rem" }}
        >
          Sin archivos adjuntos
        </Typography>
      ) : (
        <Stack spacing={1}>
          {files.map((file) => (
            <Box
              component="a"
              href={file.previewUrl}
              target="_blank"
              rel="noopener noreferrer"
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
                textDecoration: "none",
                color: "inherit",
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
                  sx={{
                    color: theme.palette.text.secondary,
                    fontSize: "0.75rem",
                  }}
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
