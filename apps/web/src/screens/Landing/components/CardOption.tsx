import { FC, useCallback } from "react";
import { ArrowRightAltRounded } from "@mui/icons-material";
import {
  Card,
  CardHeader,
  Avatar,
  CardContent,
  Typography,
  CardActions,
  Button,
  useTheme,
  alpha,
  type SvgIconProps,
} from "@mui/material";

interface Props {
  AvatarIcon: React.ComponentType<SvgIconProps>;
  title: string;
  description: string;
  buttonText: string;
  path: string;
}

export const CardOption: FC<Props> = ({
  AvatarIcon,
  title,
  description,
  buttonText,
  path,
}) => {
  const theme = useTheme();
  const backgroundColor = alpha(theme.palette.common.white, 0.1);

  const onButtonClick = useCallback(() => {
    // Implement navigation logic here using the path prop
    console.log(`Navigating to ${path}`);
  }, [path]);

  return (
    <Card
      sx={{
        background: backgroundColor,
        borderRadius: 5,
        maxWidth: 364,
        p: 2,
      }}
      elevation={0}
    >
      <CardHeader
        avatar={
          <Avatar
            sx={{
              background: backgroundColor,
              width: 56,
              height: 56,
            }}
          >
            <AvatarIcon />
          </Avatar>
        }
      />
      <CardContent sx={{ height: 152 }}>
        <Typography
          variant="subtitle1"
          fontWeight="600"
          color={theme.palette.common.white}
        >
          {title}
        </Typography>
        <Typography
          variant="subtitle1"
          color={theme.palette.common.white}
          sx={{ mt: 1 }}
        >
          {description}
        </Typography>
      </CardContent>
      <CardActions className="flex-row-reverse">
        <Button
          sx={{ backgroundColor: theme.palette.common.deepForest }}
          variant="contained"
          endIcon={<ArrowRightAltRounded />}
          onClick={onButtonClick}
        >
          {buttonText}
        </Button>
      </CardActions>
    </Card>
  );
};
