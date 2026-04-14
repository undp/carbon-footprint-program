import { FC } from "react";
import { Box, Typography, useTheme } from "@mui/material";
import { DescriptionOutlined } from "@mui/icons-material";
import { REDUCTION_PROJECT_REQUIRED_DOCUMENTS } from "@repo/constants";

export const RequiredDocumentsSection: FC = () => {
  const theme = useTheme();

  return (
    <Box className="flex flex-col gap-2">
      <Box className="flex items-center gap-2">
        <DescriptionOutlined color="primary" fontSize="small" />
        <Typography variant="subtitle1" fontWeight={600}>
          Documentos Requeridos para la Postulación
        </Typography>
      </Box>

      <Typography variant="body2" color="text.secondary">
        Para iniciar el proceso de postulación al Reconocimiento de Reducción,
        deberás adjuntar los siguientes documentos en formato PDF o JPG:
      </Typography>

      <Box className="flex flex-col gap-2 rounded-[10px] border border-gray-200 bg-gray-50 p-4">
        {REDUCTION_PROJECT_REQUIRED_DOCUMENTS.map((doc, index) => (
          <Box key={index} className="flex gap-2">
            <Typography
              variant="body2"
              fontWeight={700}
              sx={{
                color: theme.palette.primary.main,
                minWidth: 16,
              }}
            >
              {index + 1}.
            </Typography>
            <Box>
              <Typography variant="body2" fontWeight={700}>
                {doc.title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {doc.description}
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};
