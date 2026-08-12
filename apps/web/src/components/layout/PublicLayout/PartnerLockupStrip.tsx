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
  /** Height of the vertical divider between partners, in pixels. */
  dividerHeight: number;
  gap: BoxProps["gap"];
}

/**
 * Row of institutional partners separated by vertical dividers. Used by both
 * the public header and the footer, which differ only in the partners
 * included and the size of the logos.
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
