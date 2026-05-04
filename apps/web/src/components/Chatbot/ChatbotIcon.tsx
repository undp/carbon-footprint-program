import { IconButton } from "@mui/material";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import { useTheme } from "@mui/material/styles";

interface ChatbotIconProps {
  onClick: () => void;
}

export function ChatbotIcon({ onClick }: ChatbotIconProps) {
  const theme = useTheme();
  return (
    <IconButton
      onClick={onClick}
      aria-label="Abrir asistente"
      sx={{
        bgcolor: theme.palette.primary.main,
        color: theme.palette.primary.contrastText,
        width: 56,
        height: 56,
        boxShadow: theme.shadows[6],
        "&:hover": {
          bgcolor: theme.palette.primary.dark,
        },
      }}
    >
      <ChatBubbleOutlineIcon />
    </IconButton>
  );
}
