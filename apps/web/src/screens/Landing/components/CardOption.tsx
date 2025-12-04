import { FC } from "react";
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
} from "@mui/material";

interface Props {
  avatar: React.ReactNode;
  title: string;
  description: string;
  buttonText: string;
  onButtonClick?: () => void;
}

export const CardOption: FC<Props> = ({
  avatar,
  title,
  description,
  buttonText,
  onButtonClick,
}) => {
  const theme = useTheme();
  const backgroundColor = alpha(theme.palette.common.white, 0.1);

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
            {avatar}
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
