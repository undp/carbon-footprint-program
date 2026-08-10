import { FC } from "react";
import { Box, Typography } from "@mui/material";
import type { Partner } from "@/config/partners";

interface Props {
  partner: Partner;
  /** Alto del logo en píxeles; el ancho se ajusta manteniendo la proporción. */
  logoHeight: number;
  captionColor: string;
}

/**
 * Bloque "rol + logo" de un socio institucional, como aparece en el header y
 * en el pie de página públicos (p. ej. "Financiada por el / Gobierno de
 * Suecia" seguido del logo).
 */
export const PartnerLockup: FC<Props> = ({
  partner,
  logoHeight,
  captionColor,
}) => {
  const [firstLine, secondLine] = partner.roleCaption;

  return (
    <Box className="flex items-center gap-3.5">
      <Typography
        component="p"
        sx={{
          fontSize: 9,
          fontWeight: "fontWeightMedium",
          letterSpacing: "1.1px",
          textTransform: "uppercase",
          lineHeight: 1.5,
          textAlign: "right",
          whiteSpace: "nowrap",
          color: captionColor,
        }}
      >
        {firstLine}
        <br />
        {secondLine}
      </Typography>
      <Box
        component="img"
        src={partner.logoSrc}
        alt={partner.name}
        sx={{ height: logoHeight, width: "auto", display: "block" }}
      />
    </Box>
  );
};
