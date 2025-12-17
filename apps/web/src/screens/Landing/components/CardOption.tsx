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
import { useNavigate } from "@tanstack/react-router";

interface Props {
  AvatarIcon: React.ComponentType<SvgIconProps>;
  title: string;
  description: string;
  buttonText: string;
  route: string;
}

export const CardOption: FC<Props> = ({
  AvatarIcon,
  title,
  description,
  buttonText,
  route,
}) => {
  const theme = useTheme();
  const backgroundColor = alpha(theme.palette.common.white, 0.1);
  const navigate = useNavigate();
  const handleNavigate = useCallback(() => {
    void navigate({ to: route });
  }, [route, navigate]);

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
          onClick={handleNavigate}
        >
          {buttonText}
        </Button>
      </CardActions>
    </Card>
  );
};
