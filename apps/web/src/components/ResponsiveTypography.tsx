import { Typography, Tooltip, TypographyProps } from "@mui/material";
import { FC } from "react";

type ResponsiveTypographyProps = {
  isWiderScreen: boolean;
  ShortName: string;
  LongName: string;
  props?: TypographyProps;
};

export const ResponsiveTypography: FC<ResponsiveTypographyProps> = ({
  isWiderScreen: isResponsiveMode,
  ShortName,
  LongName,
}) => {
  return (
    <Tooltip title={isResponsiveMode ? LongName : null}>
      <Typography variant="body2" fontWeight={500} noWrap>
        {!isResponsiveMode ? ShortName : LongName}
      </Typography>
    </Tooltip>
  );
};
