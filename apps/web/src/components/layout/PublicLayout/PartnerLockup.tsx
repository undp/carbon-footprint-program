import { FC } from "react";
import { Box, Typography } from "@mui/material";
import type { Partner } from "@/config/partners";

interface Props {
  partner: Partner;
  /** Logo height in pixels; the width adjusts to keep the proportion. */
  logoHeight: number;
  captionColor: string;
}

/**
 * "Role + logo" block for an institutional partner, as it appears in the
 * public header and footer (e.g. "Financiada por el / Gobierno de Suecia"
 * followed by the logo).
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
