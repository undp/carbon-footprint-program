import { useRef, useState } from "react";
import { Box, IconButton, Paper, TextField, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useTheme } from "@mui/material/styles";
import { ChatbotIcon } from "./ChatbotIcon";
import { MessageBubble } from "./MessageBubble";
import { useChatStream } from "./useChatStream";

const PANEL_WIDTH = 360;
const PANEL_HEIGHT = 480;

export function ChatbotWidget() {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const { state, messages, sendMessage, deleteHistory } = useChatStream();
  const listRef = useRef<HTMLDivElement | null>(null);

  if (!open) {
    return (
      <Box
        sx={{
          position: "fixed",
          bottom: 16,
          right: 16,
          zIndex: theme.zIndex.modal + 1,
        }}
      >
        <ChatbotIcon onClick={() => setOpen(true)} />
      </Box>
    );
  }

  const handleSend = async () => {
    const content = draft.trim();
    if (!content) return;
    setDraft("");
    await sendMessage(content);
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  };

  const isBusy = state === "loading" || state === "streaming";

  return (
    <Paper
      data-testid="chatbot-widget"
      data-state={state}
      elevation={6}
      sx={{
        position: "fixed",
        bottom: 16,
        right: 16,
        width: PANEL_WIDTH,
        height: PANEL_HEIGHT,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        zIndex: theme.zIndex.modal + 1,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          py: 1,
          bgcolor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
        }}
      >
        <Typography variant="subtitle1">Asistente Huella Latam</Typography>
        <Box>
          <IconButton
            size="small"
            onClick={() => {
              if (isBusy) return;
              void deleteHistory();
            }}
            disabled={isBusy}
            aria-disabled={isBusy}
            aria-label="Borrar historial"
            sx={{ color: "inherit" }}
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => setOpen(false)}
            aria-label="Cerrar asistente"
            sx={{ color: "inherit" }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      <Box
        ref={listRef}
        sx={{
          flex: 1,
          overflowY: "auto",
          px: 1.5,
          py: 1,
          bgcolor: theme.palette.background.default,
        }}
      >
        {messages.length === 0 ? (
          <Box
            display="flex"
            alignItems="center"
            justifyContent="center"
            height="100%"
          >
            <Typography variant="body2" color="text.secondary">
              ¿En qué puedo ayudarte?
            </Typography>
          </Box>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} />)
        )}
        {state === "degraded" ? (
          <Typography
            variant="caption"
            color="error"
            display="block"
            textAlign="center"
            mt={1}
          >
            El asistente no está disponible.
          </Typography>
        ) : null}
      </Box>

      <Box
        sx={{
          display: "flex",
          gap: 1,
          alignItems: "flex-end",
          p: 1,
          borderTop: `1px solid ${theme.palette.divider}`,
        }}
      >
        <TextField
          fullWidth
          size="small"
          multiline
          maxRows={3}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Escribe tu pregunta…"
          disabled={isBusy || state === "degraded"}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
        />
        <IconButton
          color="primary"
          onClick={() => void handleSend()}
          disabled={!draft.trim() || isBusy || state === "degraded"}
          aria-label="Enviar mensaje"
        >
          <SendIcon />
        </IconButton>
      </Box>
    </Paper>
  );
}
