import { FC, Fragment } from "react";
import { Box, Divider, useTheme, type BoxProps } from "@mui/material";
import { PARTNERS, type PartnerId } from "@/config/partners";
import { PartnerLockup } from "./PartnerLockup";

export interface PartnerLockupStripItem {
  partnerId: PartnerId;
  logoHeight: number;
}

interface Props {
  items: readonly PartnerLockupStripItem[];
  captionColor: string;
  /** Alto del separador vertical entre socios, en píxeles. */
  dividerHeight: number;
  gap: BoxProps["gap"];
}

/**
 * Fila de socios institucionales separados por divisores verticales. La usan
 * tanto el header público como el pie de página, que solo se diferencian en
 * los socios incluidos y en el tamaño de los logos.
 */
export const PartnerLockupStrip: FC<Props> = ({
  items,
  captionColor,
  dividerHeight,
  gap,
}) => {
  const theme = useTheme();

  return (
    <Box className="flex flex-wrap items-center justify-center" sx={{ gap }}>
      {items.map((item, index) => (
        <Fragment key={item.partnerId}>
          {index > 0 && (
            <Divider
              orientation="vertical"
              flexItem
              sx={{
                height: dividerHeight,
                alignSelf: "center",
                borderColor: theme.palette.divider,
              }}
            />
          )}
          <PartnerLockup
            partner={PARTNERS[item.partnerId]}
            logoHeight={item.logoHeight}
            captionColor={captionColor}
          />
        </Fragment>
      ))}
    </Box>
  );
};
