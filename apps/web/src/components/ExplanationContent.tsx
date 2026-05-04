import { Box, Typography } from "@mui/material";
import { InfoOutlined } from "@mui/icons-material";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import "katex/dist/katex.min.css";

interface ExplanationContentProps {
  content?: string | null;
}

export function ExplanationContent({ content }: ExplanationContentProps) {
  if (!content || !content.trim()) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        py={5}
        gap={3}
        color="text.secondary"
      >
        <InfoOutlined sx={{ fontSize: 48, opacity: 0.5 }} />
        <Typography variant="body1">
          No existe una explicación disponible aún
        </Typography>
      </Box>
    );
  }

  return (
    <div className="prose prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeKatex, rehypeSanitize]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
