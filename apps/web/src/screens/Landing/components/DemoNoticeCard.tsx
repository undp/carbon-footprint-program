import { FC } from "react";
import { WarningAmberRounded } from "@mui/icons-material";
import { alpha, Box, Link, Typography, useTheme } from "@mui/material";
import { useCurrentTermsConditions } from "@/api/query/termsConditions";
import { TERMS_CONDITIONS_FILE_URL } from "@/config/constants";

/**
 * Aviso de que la plataforma es una demostración. El enlace a los Términos y
 * Condiciones solo se muestra cuando hay un documento vigente cargado.
 */
export const DemoNoticeCard: FC = () => {
  const theme = useTheme();
  const { data, isLoading } = useCurrentTermsConditions();

  const hasTerms = !!data?.fileName;
  const bodyColor = alpha(theme.palette.common.white, 0.92);

  const renderTermsLink = () => {
    if (isLoading || !hasTerms) return <span>Términos y Condiciones</span>;

    return (
      <Link
        href={TERMS_CONDITIONS_FILE_URL}
        target="_blank"
        rel="noopener noreferrer"
        color={theme.palette.common.white}
        underline="always"
        fontWeight="fontWeightMedium"
      >
        Términos y Condiciones
      </Link>
    );
  };

  return (
    <Box
      role="region"
      aria-label="Aviso de ambiente de demostración"
      className="flex items-start gap-4"
      sx={{
        maxWidth: 540,
        px: 3,
        py: 2.5,
        borderRadius: 3,
        border: `1px solid ${alpha(theme.palette.common.white, 0.18)}`,
        borderLeft: `5px solid ${theme.palette.common.sunflower}`,
        backgroundColor: alpha(theme.palette.common.deepForestDark, 0.55),
        backdropFilter: "blur(14px)",
        boxShadow: `0 10px 30px ${alpha(theme.palette.common.deepForestDark, 0.22)}`,
      }}
    >
      <WarningAmberRounded
        sx={{
          mt: 0.25,
          fontSize: 22,
          flexShrink: 0,
          color: theme.palette.common.sunflower,
        }}
      />
      <Box>
        <Typography
          variant="subtitle2"
          component="h2"
          fontWeight="fontWeightBold"
          color={theme.palette.common.white}
          sx={{ fontSize: 15, mb: 0.75 }}
        >
          Esta es una plataforma de demostración
        </Typography>
        <Typography
          variant="body2"
          color={bodyColor}
          sx={{ fontSize: 13.5, lineHeight: 1.65 }}
        >
          Con fines ilustrativos, formativos y de evaluación funcional.{" "}
          <Box
            component="b"
            sx={{
              fontWeight: "fontWeightBold",
              color: theme.palette.common.white,
            }}
          >
            No es un sistema de reporte oficial
          </Box>{" "}
          ni fuente oficial de datos, y los factores de emisión son
          referenciales. Te pedimos{" "}
          <Box
            component="b"
            sx={{
              fontWeight: "fontWeightBold",
              color: theme.palette.common.white,
            }}
          >
            no ingresar datos reales, sensibles o confidenciales
          </Box>
          . Consulta los {renderTermsLink()}.
        </Typography>
      </Box>
    </Box>
  );
};
