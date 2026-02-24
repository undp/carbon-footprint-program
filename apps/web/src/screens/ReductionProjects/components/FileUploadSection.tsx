import { FC } from "react";
import { Box, Typography, Divider } from "@mui/material";

type UploadItem = {
  title: string;
  formats: string;
};

type FileUploadSectionProps = {
  uploads?: UploadItem[];
};

const defaultUploads: UploadItem[] = [
  {
    title: "Informe de reducción",
    formats: "JPG, PNG, PDF, XLS (max. 3MB)",
  },
  {
    title: "Informe de verificación",
    formats: "JPG, PNG, PDF, XLS (max. 3MB)",
  },
  {
    title: "Autodeclaración de No conflicto de interés",
    formats: "JPG, PNG, PDF (max. 3MB)",
  },
];

export const FileUploadSection: FC<FileUploadSectionProps> = ({
  uploads = defaultUploads,
}) => {
  return (
    <Box className="flex flex-col gap-4">
      <Divider sx={{ opacity: 0.2 }} />
      <Typography variant="body1" sx={{ fontSize: 18 }}>
        Carga de archivos para la postulación
      </Typography>
      <Box className="flex flex-col gap-8 lg:flex-row">
        {uploads.map((upload, index) => (
          <Box key={index} className="flex flex-1 flex-col gap-3">
            <Typography
              sx={{
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              {upload.title}
            </Typography>
            <Box
              className="flex w-full items-center justify-center rounded border-0"
              sx={{
                borderColor: "primary.main",
                minHeight: 235,
              }}
            >
              <Box
                className="flex h-full w-full flex-col items-center justify-center gap-2 rounded border border-dashed px-4 py-6"
                sx={{
                  borderColor: "primary.main",
                  bgcolor: (theme) => `${theme.palette.primary.main}0D`,
                }}
              >
                <Box
                  component="span"
                  sx={{
                    fontSize: 32,
                    color: "text.primary",
                  }}
                >
                  📎
                </Box>
                <Typography sx={{ fontWeight: 600, fontSize: 16 }}>
                  Adjuntar documento
                </Typography>
                <Box>
                  <Typography
                    component="span"
                    sx={{
                      color: "primary.main",
                      textDecoration: "underline",
                      cursor: "pointer",
                    }}
                  >
                    Click para cargar
                  </Typography>
                  <Typography component="span" sx={{ fontSize: 16 }}>
                    {" "}
                    o arrastra y suelta el archivo
                  </Typography>
                </Box>
                <Typography
                  sx={{
                    fontSize: 14,
                    color: "text.secondary",
                    textAlign: "center",
                  }}
                >
                  {upload.formats}
                </Typography>
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};
