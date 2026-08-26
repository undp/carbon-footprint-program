import { FC } from "react";
import { alpha, Box, Chip, Typography, useTheme } from "@mui/material";
import type { SvgIconComponent } from "@mui/icons-material";

interface Props {
  /**
   * Omitted where the section reads as a plain title — the icon earns its place
   * when it distinguishes one section from its siblings, as the participant
   * groups do, and only adds noise on a page whose sections already differ.
   */
  Icon?: SvgIconComponent;
  title: string;
  /** Optional counter to the right of the title (e.g. "16 personas"). */
  badge?: string;
}

/**
 * Section heading for the public screens: a title, optionally preceded by an
 * icon in a light green circle and followed by a counter.
 *
 * The gap below the title is wider when there is no icon. The circle is 40px
 * against the title's ~32px line box, so it padded the row on both sides; drop
 * it and the same margin reads as the title touching its own content. Both
 * values stay well under the 48px the public layout puts between sections, so
 * a title still binds to what it introduces.
 */
export const SectionHeading: FC<Props> = ({ Icon, title, badge }) => {
  const theme = useTheme();

  return (
    <Box
      className={`${Icon ? "mb-5" : "mb-8"} flex flex-wrap items-center gap-3.5`}
    >
      {Icon && (
        <Box
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
          sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.12) }}
        >
          <Icon sx={{ fontSize: 20, color: theme.palette.primary.dark }} />
        </Box>
      )}
      <Typography
        variant="h5"
        component="h2"
        fontWeight="fontWeightBold"
        sx={{ color: theme.palette.common.deepNavyDark }}
      >
        {title}
      </Typography>
      {badge && (
        <Chip
          label={badge}
          size="small"
          sx={{
            backgroundColor: alpha(theme.palette.primary.main, 0.12),
            color: theme.palette.primary.dark,
            fontWeight: "fontWeightBold",
            fontSize: 11.5,
          }}
        />
      )}
    </Box>
  );
};
