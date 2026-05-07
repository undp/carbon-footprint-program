import { FC } from "react";
import { Box, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import { Check, GppGoodOutlined } from "@mui/icons-material";
import { VOCAB } from "@/config/vocab";

export const VerificationSealInfoSection: FC = () => {
  const theme = useTheme();

  const gradientCardSx = {
    background: theme.palette.other.gradient20,
    border: `1px solid ${alpha(theme.palette.secondary.light, 0.5)}`,
  };

  return (
    <Box className="rounded-[10px] p-4" sx={gradientCardSx}>
      <Box className="flex items-start gap-2">
        <GppGoodOutlined color="primary" sx={{ mt: 0.25 }} fontSize="small" />
        <Box>
          <Typography
            sx={{ color: theme.palette.primary.main }}
            variant="subtitle2"
            fontWeight={600}
          >
            Reconocimiento de Verificación de Huella de Carbono
          </Typography>

          <Typography
            className="mt-1"
            sx={{ color: theme.palette.primary.dark }}
            variant="body2"
          >
            El Reconocimiento de Verificación es el reconocimiento oficial
            mediante el cual Huella Latam valida que el cálculo de emisiones de
            tu {VOCAB.organization.noun.singular} cumple con los estándares
            gubernamentales establecidos.
          </Typography>

          <Box className="mt-3 rounded p-3" sx={gradientCardSx}>
            <Typography
              variant="body2"
              fontWeight={500}
              sx={{ color: theme.palette.primary.main }}
            >
              Al recibir el Reconocimiento de Verificación, obtendrás:
            </Typography>

            <Box component="ul" className="m-0 mt-1 list-none pl-0">
              <Box component="li" className="mt-1 flex gap-1">
                <Check
                  sx={{
                    color: theme.palette.primary.light,
                    fontSize: 14,
                    mt: 0.25,
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{ color: theme.palette.primary.dark }}
                >
                  <strong>Reconocimiento de Verificación Oficial</strong> que
                  certifica que tu huella fue validada por un organismo externo
                  acreditado
                </Typography>
              </Box>
              <Box component="li" className="mt-1 flex gap-1">
                <Check
                  sx={{
                    color: theme.palette.primary.light,
                    fontSize: 14,
                    mt: 0.25,
                  }}
                />
                <Typography
                  variant="body2"
                  sx={{ color: theme.palette.primary.dark }}
                >
                  <strong>Reconocimiento público</strong> como{" "}
                  {VOCAB.organization.noun.singular}
                  comprometida con la transparencia climática
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
