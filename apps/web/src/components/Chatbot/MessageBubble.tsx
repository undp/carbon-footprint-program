import { memo, useState } from "react";
import {
  Box,
  CircularProgress,
  Collapse,
  IconButton,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import type { ChatbotMessage } from "./types";

interface MessageBubbleProps {
  message: ChatbotMessage;
}

// One corpus source can contribute several retrieved chunks to the same turn.
// The panel lists sources, not chunks, so collapse them by cite_url.
const dedupeSourcesByUrl = <T extends { cite_url: string }>(
  sources: T[]
): T[] => {
  const seen = new Set<string>();
  return sources.filter((source) => {
    if (seen.has(source.cite_url)) return false;
    seen.add(source.cite_url);
    return true;
  });
};

// Memoized: each SSE delta replaces the `messages` array, but only the
// in-flight assistant message object gets a new identity (updateLastAssistant
// mutates just that index) — every prior bubble keeps its reference. Without
// memo, one delta would re-render and re-parse every message through
// react-markdown + remark-* + rehype-katex (O(messages) per token).
export const MessageBubble = memo(function MessageBubble({
  message,
}: MessageBubbleProps) {
  const theme = useTheme();
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const isUser = message.role === "user";

  // A failed turn (unreachable server, degraded, too-large, or a mid-stream
  // error) renders as a left-aligned tinted bubble with an error icon, so it
  // never looks like a real assistant reply. Error text is a plain Spanish
  // string, so it skips the markdown pipeline.
  if (message.error) {
    return (
      <Box display="flex" justifyContent="flex-start" mb={1}>
        <Box
          sx={{
            maxWidth: "85%",
            display: "flex",
            gap: 1,
            alignItems: "flex-start",
            bgcolor: alpha(theme.palette.error.main, 0.1),
            color: theme.palette.error.dark,
            border: `1px solid ${alpha(theme.palette.error.main, 0.4)}`,
            borderRadius: 2,
            px: 1.5,
            py: 1,
            overflowWrap: "anywhere",
          }}
        >
          <ErrorOutlineIcon
            fontSize="small"
            sx={{ color: theme.palette.error.main, mt: "2px", flexShrink: 0 }}
          />
          <Typography variant="body2">{message.content}</Typography>
        </Box>
      </Box>
    );
  }

  const bubbleBg = isUser
    ? theme.palette.primary.main
    : alpha(theme.palette.text.primary, 0.06);
  const textColor = isUser
    ? theme.palette.primary.contrastText
    : theme.palette.text.primary;
  const uniqueSources = dedupeSourcesByUrl(message.sourcesCited ?? []);
  const hasSources = !isUser && uniqueSources.length > 0;

  // Column layout so the citations panel stacks under the bubble; alignItems
  // does the horizontal alignment justifyContent did in the row layout.
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems={isUser ? "flex-end" : "flex-start"}
      mb={1}
    >
      <Box
        sx={{
          maxWidth: "85%",
          bgcolor: bubbleBg,
          color: textColor,
          borderRadius: 2,
          px: 1.5,
          py: 1,
          // Break long unbroken strings (e.g. URLs or `aaaa…` test input)
          // mid-token instead of letting them overflow the bubble and force a
          // horizontal scrollbar on the panel.
          overflowWrap: "anywhere",
        }}
      >
        {isUser ? (
          <Typography variant="body2" whiteSpace="pre-wrap">
            {message.content}
          </Typography>
        ) : (
          // Raw markdown elements (<p>, <li>, …) don't inherit MUI typography,
          // so pin the container to body2 — the same size the user bubble uses
          // — to keep both roles' message text visually consistent.
          <Box sx={{ typography: "body2", "& p": { my: 0.5 } }}>
            {message.content ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                // Strip inline citations at render time — the V1 corpus is
                // dominated by a single source, so repeated `[label](url)`
                // markers are noise; attribution lives in the
                // "Fuentes consultadas" panel below.
                components={{ a: () => null }}
              >
                {message.content}
              </ReactMarkdown>
            ) : (
              // No content yet — the turn is in flight (loading, before the
              // first token). Show a spinner instead of a static placeholder.
              <CircularProgress
                size={18}
                thickness={5}
                aria-label="Generando respuesta"
                sx={{ display: "block", my: 0.5, color: "text.secondary" }}
              />
            )}
            {message.truncated ? (
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                mt={0.5}
              >
                Respuesta interrumpida.
              </Typography>
            ) : null}
          </Box>
        )}
      </Box>
      {hasSources ? (
        <Box mt={0.5} maxWidth="85%" width="100%">
          <Box display="flex" alignItems="center" gap={0.5}>
            <IconButton
              size="small"
              aria-label="Ver fuentes consultadas"
              aria-expanded={sourcesOpen}
              onClick={() => setSourcesOpen((prev) => !prev)}
              sx={{
                transform: sourcesOpen ? "rotate(180deg)" : "none",
                transition: "transform 0.2s",
              }}
            >
              <ExpandMoreIcon fontSize="small" />
            </IconButton>
            <Typography variant="caption" color="text.secondary">
              {`Fuentes consultadas (${uniqueSources.length})`}
            </Typography>
          </Box>
          <Collapse in={sourcesOpen}>
            <Stack spacing={0.5} mt={0.5} pl={2}>
              {uniqueSources.map((source) => (
                <Box key={source.cite_url}>
                  <Link
                    href={source.cite_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="caption"
                  >
                    {source.cite_label}
                  </Link>
                </Box>
              ))}
            </Stack>
          </Collapse>
        </Box>
      ) : null}
    </Box>
  );
});
