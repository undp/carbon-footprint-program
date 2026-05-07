import { FC } from "react";
import { Alert, AlertTitle, alpha, Box, Link, useTheme } from "@mui/material";
import { useCurrentTermsConditions } from "@/api/query/termsConditions";
import { TERMS_CONDITIONS_FILE_URL } from "@/config/constants";

export const LandingFooter: FC = () => {
  const theme = useTheme();
  const { data, isLoading } = useCurrentTermsConditions();
  const hasTerms = !!data?.fileName;

  return (
    <Box sx={{ mt: "auto", px: 3, pb: 3, position: "relative", zIndex: 1 }}>
      <Alert
        icon={false}
        sx={{
          bgcolor: alpha(theme.palette.primary.main, 0.5),
          border: "2px solid",
          borderColor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
        }}
      >
        <AlertTitle>Ambiente Demo</AlertTitle>
        Esta plataforma es una demo con fines exclusivamente ilustrativos,
        formativos y de evaluación funcional.{" "}
        <b>NO es una plataforma productiva</b>, no constituye una fuente oficial
        de datos ni un sistema de reporte regulatorio. Se recomienda
        enfáticamente{" "}
        <b>NO ingresar datos reales, sensibles o confidenciales.</b>{" "}
        {isLoading || !hasTerms ? (
          <span>Consulta los Términos y Condiciones</span>
        ) : (
          <>
            Consulta los{" "}
            <Link
              href={TERMS_CONDITIONS_FILE_URL}
              target="_blank"
              rel="noopener noreferrer"
              color="inherit"
              underline="always"
            >
              Términos y Condiciones
            </Link>
            .
          </>
        )}
      </Alert>
    </Box>
  );
};
