import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Box,
  IconButton,
  Paper,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import MinimizeIcon from "@mui/icons-material/Minimize";
import SendIcon from "@mui/icons-material/Send";
import AddIcon from "@mui/icons-material/Add";
import DragHandleIcon from "@mui/icons-material/DragHandle";
import { useTheme } from "@mui/material/styles";
import { CHATBOT_MAX_USER_INPUT_CHARS } from "@repo/types";
import { APP_LOCALE, CHATBOT_INTRODUCED_KEY } from "@/config/constants";
import { ActionIconButton } from "@/components/ActionIconButton";
import { ChatbotIcon } from "./ChatbotIcon";
import { MessageBubble } from "./MessageBubble";
import { useChatStream } from "./useChatStream";
import { useChatbotSize } from "./useChatbotSize";

// Counter stays hidden during normal use; appears once the draft approaches
// the cap so the user is not surprised by a hard stop.
const COUNTER_VISIBILITY_THRESHOLD = 0.8;
const COUNTER_WARNING_THRESHOLD = 0.95;

const FOOT_DISCLAIMER =
  "Huella usa IA y puede equivocarse. Verifica las respuestas con las fuentes citadas.";

const hasBeenIntroduced = (): boolean => {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(CHATBOT_INTRODUCED_KEY) === "true";
  } catch {
    // Storage disabled — treat as introduced so we never spam the auto-open.
    return true;
  }
};

const markIntroduced = (): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CHATBOT_INTRODUCED_KEY, "true");
  } catch {
    // Quota / disabled — ignore; worst case the user sees the auto-open
    // again next visit.
  }
};

export function ChatbotWidget() {
  const theme = useTheme();
  // Tracks whether `open` started as `true` via the first-visit auto-open
  // path (vs. an explicit user click). The focus effect consumes this flag
  // to skip stealing focus from the landing on the very first paint. The
  // ref is *initialized* to false here and mirrored to the auto-open
  // decision in the layout effect below — refs are off-limits inside the
  // state initializer per `react-hooks/refs`.
  const autoOpenedRef = useRef(false);
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.location.pathname === "/" && !hasBeenIntroduced();
  });
  const [draft, setDraft] = useState("");
  const { state, messages, sendMessage, startNewConversation } =
    useChatStream();
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const numberFormatter = useMemo(() => new Intl.NumberFormat(APP_LOCALE), []);
  // Resize is gated on viewport width — on phones the default size already
  // fills most of the screen and dragging a tiny corner is impractical.
  const isResizeCapable = useMediaQuery(theme.breakpoints.up("sm"));
  const { size, startResize } = useChatbotSize(isResizeCapable);

  // Focus the input and place the caret at the end of any preserved draft.
  // Plain `.focus()` would put the caret at position 0 when the textarea
  // already has text — surprising when reopening the widget after typing.
  const focusInputAtEnd = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    const end = el.value.length;
    el.setSelectionRange(end, end);
  }, []);

  // Mirror the auto-open decision to the ref before the focus effect runs.
  // Layout effects fire after commit but BEFORE the regular `useEffect`
  // that consumes the ref, so the ordering is deterministic on first
  // mount. Reading `window` here (instead of trusting `open` as a proxy)
  // keeps this effect independent of the open-state lineage.
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const onLanding = window.location.pathname === "/";
    if (onLanding && !hasBeenIntroduced()) {
      autoOpenedRef.current = true;
    }
  }, []);

  // Focus the input every time the widget opens so the user can start
  // typing without an extra click. The TextField mounts fresh on each
  // open (the `Paper` tree is fully unmounted in the collapsed branch),
  // so this effect catches both the very first open and every reopen
  // after the X button. The auto-open path is exempted so we do not
  // steal focus from the landing on first paint.
  useEffect(() => {
    if (!open) return;
    if (autoOpenedRef.current) {
      autoOpenedRef.current = false;
      return;
    }
    focusInputAtEnd();
  }, [open, focusInputAtEnd]);

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
    markIntroduced();
    setDraft("");
    // Schedule the scroll for the next frame so it runs after React has
    // committed the user message + assistant placeholder appended by
    // sendMessage. Done BEFORE awaiting the SSE stream because the turn
    // may take many seconds — we want the active bubble in view from
    // the first delta, not after the stream completes. Restoring focus
    // in the same frame keeps the keyboard ready for the next message
    // even though the TextField is briefly disabled while busy.
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: "smooth",
      });
      inputRef.current?.focus();
    });
    await sendMessage(content);
    // Re-focus once the turn ends — the disabled prop on the TextField
    // can pull focus away while the request is in flight.
    inputRef.current?.focus();
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
        width: size.width,
        height: size.height,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        zIndex: theme.zIndex.modal + 1,
      }}
    >
      {isResizeCapable ? (
        <Box
          role="separator"
          aria-orientation="vertical"
          aria-label="Cambiar tamaño del asistente"
          onPointerDown={startResize}
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 18,
            height: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "nwse-resize",
            color: theme.palette.primary.contrastText,
            opacity: 0.45,
            transition: theme.transitions.create("opacity", {
              duration: theme.transitions.duration.shortest,
            }),
            // Block native touch scroll so the drag is interpreted as a
            // resize gesture instead of a page scroll on touch devices.
            touchAction: "none",
            zIndex: 2,
            "&:hover": { opacity: 1 },
          }}
        >
          <DragHandleIcon sx={{ fontSize: 16, transform: "rotate(-45deg)" }} />
        </Box>
      ) : null}
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
        <Box sx={{ color: "inherit" }}>
          <ActionIconButton
            icon={AddIcon}
            tooltip="Nueva conversación"
            color="inherit"
            disabled={isBusy}
            onClick={() => {
              if (isBusy) return;
              markIntroduced();
              startNewConversation();
              // Return focus to the input so the user can immediately
              // start a new message; the click would otherwise leave
              // focus on this IconButton.
              focusInputAtEnd();
            }}
          />
          <ActionIconButton
            icon={MinimizeIcon}
            tooltip="Minimizar"
            color="inherit"
            onClick={() => {
              markIntroduced();
              setOpen(false);
            }}
          />
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
            // Only disabled when the assistant is permanently unavailable.
            // Keeping the field enabled while streaming preserves keyboard
            // focus across the send cycle — disabling it would blur the
            // input, and the browser does not restore focus when the field
            // re-enables, so the next keystroke would land nowhere. Double-
            // sends are still blocked by the `isBusy` guard in handleSend
            // and by the send button being disabled.
            disabled={state === "degraded"}
            inputRef={inputRef}
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
      <Box
        sx={{
          px: 1,
          pb: 0.5,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          textAlign="center"
        >
          {FOOT_DISCLAIMER}
        </Typography>
      </Box>
    </Paper>
  );
}
