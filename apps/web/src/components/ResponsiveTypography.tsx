import { Typography, Tooltip, TypographyProps } from "@mui/material";
import { FC } from "react";

interface Props extends TypographyProps {
  isWiderScreen: boolean;
  ShortName: string;
  LongName: string;
}

export const ResponsiveTypography: FC<Props> = ({
  isWiderScreen,
  ShortName,
  LongName,
  ...props
}) => {
  return (
    <Tooltip title={!isWiderScreen ? LongName : null}>
      <Typography variant="body2" fontWeight={500} noWrap {...props}>
        {!isWiderScreen ? ShortName : LongName}
      </Typography>
    </Tooltip>
  );
};
