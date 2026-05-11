import { useMemo, useRef, useState } from "react";
import { Box, IconButton, Paper, TextField, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useTheme } from "@mui/material/styles";
import { CHATBOT_MAX_USER_INPUT_CHARS } from "@repo/types";
import { APP_LOCALE } from "@/config/constants";
import { ChatbotIcon } from "./ChatbotIcon";
import { MessageBubble } from "./MessageBubble";
import { useChatStream } from "./useChatStream";

const PANEL_WIDTH = 360;
const PANEL_HEIGHT = 480;
// Counter stays hidden during normal use; appears once the draft approaches
// the cap so the user is not surprised by a hard stop.
const COUNTER_VISIBILITY_THRESHOLD = 0.8;
const COUNTER_WARNING_THRESHOLD = 0.95;

export function ChatbotWidget() {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const { state, messages, sendMessage, deleteHistory } = useChatStream();
  const listRef = useRef<HTMLDivElement | null>(null);
  const numberFormatter = useMemo(() => new Intl.NumberFormat(APP_LOCALE), []);

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

  const isBusy = state === "loading" || state === "streaming";

  const draftLength = draft.length;
  const draftRatio = draftLength / CHATBOT_MAX_USER_INPUT_CHARS;
  const showCounter = draftRatio >= COUNTER_VISIBILITY_THRESHOLD;
  const counterColor =
    draftLength >= CHATBOT_MAX_USER_INPUT_CHARS
      ? "error.main"
      : draftRatio >= COUNTER_WARNING_THRESHOLD
        ? "warning.main"
        : "text.secondary";

  const handleSend = async () => {
    // Guard against double-sends when the user mashes Enter or the send
    // button: the IconButton is disabled while busy, but the keyboard
    // path can still re-enter handleSend before React applies the
    // disabled prop on the next render.
    if (isBusy || state === "degraded") return;
    const content = draft.trim();
    if (!content) return;
    setDraft("");
    // Schedule the scroll for the next frame so it runs after React has
    // committed the user message + assistant placeholder appended by
    // sendMessage. Done BEFORE awaiting the SSE stream because the turn
    // may take many seconds — we want the active bubble in view from
    // the first delta, not after the stream completes.
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
    await sendMessage(content);
  };

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
          overflowX: "hidden",
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
          p: 1,
          borderTop: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box sx={{ display: "flex", gap: 1, alignItems: "flex-end" }}>
          <TextField
            fullWidth
            size="small"
            multiline
            maxRows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Escribe tu pregunta…"
            disabled={isBusy || state === "degraded"}
            inputProps={{ maxLength: CHATBOT_MAX_USER_INPUT_CHARS }}
            onKeyDown={(e) => {
              // Skip Enter when an IME composition is in progress — otherwise
              // confirming a kana / pinyin candidate with Enter would also
              // submit the message. nativeEvent.isComposing covers older
              // browsers; keyCode 229 is the legacy in-composition signal.
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing &&
                e.keyCode !== 229
              ) {
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
        {showCounter ? (
          <Typography
            variant="caption"
            sx={{
              display: "block",
              textAlign: "right",
              mt: 0.5,
              color: counterColor,
              fontVariantNumeric: "tabular-nums",
            }}
            aria-live="polite"
          >
            {numberFormatter.format(draftLength)} /{" "}
            {numberFormatter.format(CHATBOT_MAX_USER_INPUT_CHARS)}
          </Typography>
        ) : null}
      </Box>
    </Paper>
  );
}
