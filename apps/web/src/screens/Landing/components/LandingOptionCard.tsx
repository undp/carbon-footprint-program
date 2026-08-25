import { FC } from "react";
import { ArrowRightAltRounded } from "@mui/icons-material";
import {
  alpha,
  Avatar,
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Typography,
  useTheme,
  type SvgIconProps,
} from "@mui/material";

/**
 * Which of the two doors the card is. The tone is not decoration: the comments
 * from the ministry asked for the two modules to be told apart at a glance, so
 * the exploratory one stays a translucent pane of the hero while the one that
 * opens an account lifts off it as a solid card with a leaf-green edge.
 */
export type LandingOptionTone = "glass" | "solid";

interface Props {
  AvatarIcon: React.ComponentType<SvgIconProps>;
  tone: LandingOptionTone;
  title: string;
  description: string;
  actionText: string;
  /** Line under the action, for a door that leads somewhere unexpected. */
  helperText?: string;
  isBusy?: boolean;
  onAction: () => void;
}

/** One of the two ways into the platform offered by the landing. */
export const LandingOptionCard: FC<Props> = ({
  AvatarIcon,
  tone,
  title,
  description,
  actionText,
  helperText,
  isBusy = false,
  onAction,
}) => {
  const theme = useTheme();

  const isSolid = tone === "solid";

  const surface = isSolid
    ? {
        background: `linear-gradient(150deg, ${theme.palette.common.white} 0%, ${alpha(theme.palette.secondary.light, 0.22)} 100%)`,
        border: `1px solid ${alpha(theme.palette.secondary.main, 0.35)}`,
        borderLeft: `6px solid ${theme.palette.secondary.light}`,
        boxShadow: `0 14px 38px ${alpha(theme.palette.common.deepNavyDark, 0.22)}`,
      }
    : {
        background: `linear-gradient(150deg, ${alpha(theme.palette.common.white, 0.34)}, ${alpha(theme.palette.common.white, 0.2)})`,
        border: `1px solid ${alpha(theme.palette.common.white, 0.5)}`,
        backdropFilter: "blur(6px) saturate(1.2)",
        boxShadow: `inset 0 1px 0 ${alpha(theme.palette.common.white, 0.45)}`,
      };

  const avatarBackground = isSolid
    ? alpha(theme.palette.secondary.light, 0.38)
    : alpha(theme.palette.common.white, 0.55);

  return (
    <Card
      elevation={0}
      sx={{ borderRadius: 4, px: 4, pt: 3.5, pb: 3, ...surface }}
    >
      <CardHeader
        sx={{ p: 0, mb: 2 }}
        avatar={
          <Avatar
            sx={{
              width: 52,
              height: 52,
              backgroundColor: avatarBackground,
              border: `1px solid ${alpha(theme.palette.common.white, 0.6)}`,
            }}
          >
            <AvatarIcon sx={{ color: theme.palette.primary.main }} />
          </Avatar>
        }
        title={
          <Typography
            variant="h6"
            component="h2"
            fontWeight="fontWeightBold"
            color={theme.palette.primary.main}
          >
            {title}
          </Typography>
        }
      />
      <CardContent sx={{ p: 0 }}>
        <Typography
          variant="body1"
          color={theme.palette.common.deepNavyDark}
          sx={{ lineHeight: 1.6 }}
        >
          {description}
        </Typography>
      </CardContent>
      <CardActions
        sx={{ p: 0, mt: 2.5, display: "flex", flexWrap: "wrap", gap: 1.5 }}
      >
        <Button
          variant="contained"
          endIcon={<ArrowRightAltRounded />}
          onClick={onAction}
          disabled={isBusy}
          loading={isBusy}
          sx={{
            borderRadius: 1.25,
            px: 2.5,
            py: 1.375,
            fontSize: 12.5,
            fontWeight: "fontWeightBold",
            letterSpacing: "1.1px",
          }}
        >
          {actionText}
        </Button>
        {helperText && (
          <Typography
            component="p"
            color={theme.palette.common.deepNavyDark}
            sx={{ width: "100%", fontSize: 12.5, lineHeight: 1.5 }}
          >
            {helperText}
          </Typography>
        )}
      </CardActions>
    </Card>
  );
};
