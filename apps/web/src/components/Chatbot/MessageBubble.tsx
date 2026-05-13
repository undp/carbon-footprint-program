import { useState } from "react";
import {
  Box,
  Collapse,
  IconButton,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { alpha, useTheme } from "@mui/material/styles";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import type { ChatbotMessage } from "./types";

interface MessageBubbleProps {
  message: ChatbotMessage;
}

const ExternalLink = (
  props: React.AnchorHTMLAttributes<HTMLAnchorElement>
): React.ReactElement => (
  <Link
    {...props}
    target="_blank"
    rel="noopener noreferrer"
    underline="always"
    color="primary"
  />
);

export function MessageBubble({ message }: MessageBubbleProps) {
  const theme = useTheme();
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const isUser = message.role === "user";
  const bubbleBg = isUser
    ? theme.palette.primary.main
    : alpha(theme.palette.text.primary, 0.06);
  const textColor = isUser
    ? theme.palette.primary.contrastText
    : theme.palette.text.primary;
  const sources = message.sourcesCited ?? [];
  const hasSources = !isUser && sources.length > 0;

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
          <Box sx={{ "& p": { my: 0.5 } }}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{ a: ExternalLink }}
            >
              {message.content || "…"}
            </ReactMarkdown>
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
              {`Fuentes consultadas (${sources.length})`}
            </Typography>
          </Box>
          <Collapse in={sourcesOpen}>
            <Stack spacing={0.5} mt={0.5} pl={2}>
              {sources.map((source) => (
                <Box key={`${source.source_id}-${source.chunk_id}`}>
                  <Link
                    href={source.cite_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="caption"
                  >
                    {source.cite_label}
                  </Link>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                  >
                    {source.snippet}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Collapse>
        </Box>
      ) : null}
    </Box>
  );
}
