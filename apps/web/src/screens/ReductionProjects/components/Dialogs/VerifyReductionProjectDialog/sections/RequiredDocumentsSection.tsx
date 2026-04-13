import { FC } from "react";
import { Box, Typography, useTheme } from "@mui/material";
import { DescriptionOutlined } from "@mui/icons-material";

const REQUIRED_DOCUMENTS = [
  {
    number: 1,
    title: "Informe del Proyecto de Reducción",
    description:
      "Documento que detalla la metodología, escenarios de línea base y proyecto, y resultados de la reducción de emisiones",
  },
  {
    number: 2,
    title: "Informe de Verificación por Tercera Parte",
    description:
      "Informe emitido por un organismo verificador, con declaración de verificación firmada",
  },
  {
    number: 3,
    title: "Declaración jurada de No Conflicto de Interés",
    description:
      "Checkbox de la plataforma y/o documento firmado por el representante legal",
  },
];

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
        {REQUIRED_DOCUMENTS.map((doc) => (
          <Box key={doc.number} className="flex gap-2">
            <Typography
              variant="body2"
              fontWeight={700}
              sx={{
                color: theme.palette.primary.main,
                minWidth: 16,
              }}
            >
              {doc.number}.
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
