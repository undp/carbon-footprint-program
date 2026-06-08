import { FC, useState, useEffect, useRef } from "react";
import {
  Box,
  IconButton,
  Popover,
  Typography,
  Divider,
  useTheme,
  alpha,
} from "@mui/material";
import { CheckOutlined } from "@mui/icons-material";
import { useFormContext, useFormState } from "react-hook-form";
import { getNestedError } from "./cellUtils";
import type { IconName, IconNameFormValue } from "@repo/types";
import { CATEGORY_ICON_MAP } from "@/utils/categoryIcons";
import { CATEGORY_COLORS, getColorPalette } from "@/utils/categoryColors";

const ICON_ENTRIES = Object.entries(CATEGORY_ICON_MAP) as [
  IconName,
  (typeof CATEGORY_ICON_MAP)[IconName],
][];

interface IconPickerCellBaseProps {
  iconName: IconNameFormValue;
  color: string;
  isEditing: boolean;
  rowIndex: number;
  formArrayName: string;
  onChangeIcon: (iconName: IconName) => void;
  onClick?: () => void;
}

type IconPickerCellProps =
  | (IconPickerCellBaseProps & {
      /** When false or omitted, the color picker remains visible and must be handled. */
      hideColor?: false;
      onChangeColor: (color: string) => void;
    })
  | (IconPickerCellBaseProps & {
      /** When true, hides the color picker section and uses a neutral background. */
      hideColor: true;
      onChangeColor?: undefined;
    });

export const IconPickerCell: FC<IconPickerCellProps> = (props) => {
  const {
    iconName,
    color,
    isEditing,
    rowIndex,
    formArrayName,
    onChangeIcon,
    onClick,
  } = props;
  /** When true, hides the color picker section and uses a neutral background */
  const hideColor = props.hideColor ?? false;
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const pendingAnchorRef = useRef<HTMLElement | null>(null);
  const theme = useTheme();
  const popoverId = anchorEl ? `icon-picker-popover-${rowIndex}` : undefined;
  const iconFieldName = `${formArrayName}.${rowIndex}.icon`;
  const colorFieldName = `${formArrayName}.${rowIndex}.color`;

  // Defer popover open until isEditing is true; avoids opening before the row enters edit mode.
  useEffect(() => {
    if (isEditing && pendingAnchorRef.current) {
      setAnchorEl(pendingAnchorRef.current);
      pendingAnchorRef.current = null;
    } else if (!isEditing) {
      pendingAnchorRef.current = null;
      setAnchorEl(null);
    }
  }, [isEditing]);

  const { control } = useFormContext();
  const { errors } = useFormState({
    control,
    name: hideColor ? [iconFieldName] : [iconFieldName, colorFieldName],
  });
  const iconError = getNestedError(errors, formArrayName, rowIndex, "icon");
  const colorError = hideColor
    ? undefined
    : getNestedError(errors, formArrayName, rowIndex, "color");
  const hasError = isEditing && (!!iconError || !!colorError);

  const IconComponent = iconName ? CATEGORY_ICON_MAP[iconName] : null;
  const isInteractive = isEditing || !!onClick;
  const effectiveColor = hideColor
    ? color || "#E8E8E8"
    : color
      ? getColorPalette(color).light
      : "transparent";

  return (
    <>
      <IconButton
        size="small"
        disableRipple
        disabled={!isInteractive}
        aria-label={iconName ? `Editar ícono ${iconName}` : "Seleccionar ícono"}
        aria-haspopup="dialog"
        aria-controls={popoverId}
        aria-expanded={Boolean(anchorEl)}
        onClick={(e) => {
          if (isEditing) {
            setAnchorEl(e.currentTarget);
          } else if (onClick) {
            pendingAnchorRef.current = e.currentTarget;
            onClick();
          }
        }}
        sx={
          IconComponent
            ? {
                backgroundColor: effectiveColor || "transparent",
                width: 40,
                height: 40,
                cursor: isInteractive ? "pointer" : "default",
                "&:hover": {
                  backgroundColor: effectiveColor || "transparent",
                  opacity: isInteractive ? 0.8 : 1,
                },
                "&.Mui-disabled": {
                  backgroundColor: effectiveColor || "transparent",
                },
                ...(hasError && {
                  border: "2px dashed",
                  borderColor: "error.main",
                }),
              }
            : {
                width: 40,
                height: 40,
                cursor: isInteractive ? "pointer" : "default",
                border: "2px dashed",
                borderColor: hasError ? "error.main" : "grey.400",
                backgroundColor: "transparent",
                "&:hover": { opacity: isInteractive ? 0.7 : 1 },
                "&.Mui-disabled": { borderColor: "grey.300" },
              }
        }
      >
        {IconComponent && (
          <IconComponent
            fontSize="small"
            sx={{ color: "rgba(0, 0, 0, 0.7)" }}
          />
        )}
      </IconButton>
      <Popover
        id={popoverId}
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
      >
        <Box sx={{ p: 1.5, width: 260 }}>
          <Typography
            variant="caption"
            color={iconError ? "error" : "text.secondary"}
            sx={{ mb: 0.5, display: "block" }}
          >
            Ícono{iconError ? ` — ${iconError.message}` : ""}
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 0.5,
              mb: 1,
              p: 0.5,
              borderRadius: 1,
              border: iconError ? "1px solid" : "none",
              borderColor: "error.main",
            }}
          >
            {ICON_ENTRIES.map(([name, Icon]) => (
              <IconButton
                key={name}
                size="small"
                disableRipple
                aria-label={`Seleccionar ícono ${name}`}
                aria-pressed={name === iconName}
                onClick={() => {
                  onChangeIcon(name);
                  setAnchorEl(null);
                }}
                sx={{
                  borderRadius: 1,
                  backgroundColor:
                    name === iconName
                      ? alpha(theme.palette.primary.main, 0.3)
                      : "transparent",
                  "&:hover": { backgroundColor: "grey.200" },
                }}
              >
                <Icon fontSize="small" />
              </IconButton>
            ))}
          </Box>

          {!props.hideColor && (
            <>
              <Divider sx={{ my: 1 }} />

              <Typography
                variant="caption"
                color={colorError ? "error" : "text.secondary"}
                sx={{ mb: 0.5, display: "block" }}
              >
                Color de fondo{colorError ? ` — ${colorError.message}` : ""}
              </Typography>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(6, 1fr)",
                  gap: 0.5,
                  p: 0.5,
                  borderRadius: 1,
                  border: colorError ? "1px solid" : "none",
                  borderColor: "error.main",
                }}
              >
                {CATEGORY_COLORS.map((c) => (
                  <IconButton
                    size="small"
                    key={c}
                    disableRipple
                    aria-label={`Seleccionar color ${c}`}
                    aria-pressed={c === color}
                    onClick={() => {
                      props.onChangeColor(c);
                      setAnchorEl(null);
                    }}
                    sx={{
                      backgroundColor: c,
                      width: 32,
                      height: 32,
                      border: c === color ? "2px solid" : "1px solid",
                      borderColor: c === color ? "primary.main" : "grey.300",
                      borderRadius: "50%",
                      "&:hover": {
                        backgroundColor: c,
                        opacity: 0.8,
                      },
                    }}
                  >
                    {c === color && (
                      <CheckOutlined
                        sx={{ fontSize: 14, color: "primary.main" }}
                      />
                    )}
                  </IconButton>
                ))}
              </Box>
            </>
          )}
        </Box>
      </Popover>
    </>
  );
};
