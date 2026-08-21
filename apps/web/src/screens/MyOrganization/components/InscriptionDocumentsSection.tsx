import { FC } from "react";
import { Box, Typography, useTheme } from "@mui/material";
import { DescriptionOutlined } from "@mui/icons-material";
import {
  INSCRIPTION_BASE_DOCUMENTS,
  INSCRIPTION_CONDITIONAL_DOCUMENTS,
} from "@repo/constants";
import { VOCAB } from "@/config/vocab";

type DocumentItem = {
  title: string;
  description: string;
};

const DocumentList: FC<{ documents: readonly DocumentItem[] }> = ({
  documents,
}) => {
  const theme = useTheme();

  return (
    <Box className="flex flex-col gap-2 rounded-[10px] border border-gray-200 bg-gray-50 p-4">
      {documents.map((doc) => (
        <Box key={doc.title} className="flex gap-2">
          <Typography
            variant="body2"
            fontWeight={700}
            sx={{ color: theme.palette.primary.main, minWidth: 16 }}
          >
            •
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
  );
};

/**
 * States which documents evidence the organization's identity and its
 * representative's authority before the applicant attaches anything. The two
 * groups are rendered as separate categories on purpose: the base document is
 * always demanded, while the conditional ones depend on how the organization is
 * constituted, and one undifferentiated list would read as "attach all five".
 */
export const InscriptionDocumentsSection: FC = () => (
  <Box className="flex flex-col gap-2">
    <Box className="flex items-center gap-2">
      <DescriptionOutlined color="primary" fontSize="small" />
      <Typography variant="subtitle1" fontWeight={600}>
        {`Documentos para la ${VOCAB.inscription.noun.singular}`}
      </Typography>
    </Box>

    <Typography variant="body2" color="text.secondary">
      Documento base, siempre requerido:
    </Typography>
    <DocumentList documents={INSCRIPTION_BASE_DOCUMENTS} />

    <Typography variant="body2" color="text.secondary">
      Documentos requeridos según corresponda:
    </Typography>
    <DocumentList documents={INSCRIPTION_CONDITIONAL_DOCUMENTS} />
  </Box>
);
