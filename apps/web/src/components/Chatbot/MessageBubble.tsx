import { Box, Typography } from "@mui/material";
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

export function MessageBubble({ message }: MessageBubbleProps) {
  const theme = useTheme();
  const isUser = message.role === "user";
  const bubbleBg = isUser
    ? theme.palette.primary.main
    : alpha(theme.palette.text.primary, 0.06);
  const textColor = isUser
    ? theme.palette.primary.contrastText
    : theme.palette.text.primary;

  return (
    <Box
      display="flex"
      justifyContent={isUser ? "flex-end" : "flex-start"}
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
    </Box>
  );
}
