import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), "");

  // Validate required environment variables
  const requiredEnvVars = ["VITE_API_BASE_URL"];
  const missingEnvVars = requiredEnvVars.filter((key) => !env[key]);

  if (missingEnvVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingEnvVars.join(", ")}\n` +
        `Please ensure these are set in your .env file or environment.`
    );
  }

  return {
    plugins: [
      tanstackRouter({
        target: "react",
        autoCodeSplitting: true,
      }),
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@components": path.resolve(__dirname, "./src/components"),
        "@screens": path.resolve(__dirname, "./src/screens"),
        "@assets": path.resolve(__dirname, "./src/assets"),
        "@icons": path.resolve(__dirname, "./src/icons"),
        "@interfaces": path.resolve(__dirname, "./src/interfaces"),
      },
    },
    optimizeDeps: {
      include: [
        "@mui/material",
        "@mui/icons-material",
        "@mui/x-date-pickers",
        "@mui/x-charts",
        "@mui/x-data-grid",
        "@emotion/react",
        "@emotion/styled",
      ],
      exclude: [
        "@prisma/client",
        "@prisma/client/runtime/client",
        "@repo/database",
      ],
    },
    build: {
      rollupOptions: {
        external: [
          "@prisma/client",
          "@prisma/client/runtime/client",
          /^@repo\/database$/,
        ],
      },
    },
    server: {
      // The chatbot widget posts to /api/chatbot/... with a relative URL so
      // the SameSite=Lax cookie rides along. The Vite dev proxy forwards
      // /api/* to the API at VITE_API_BASE_URL, keeping it same-origin from
      // the browser's perspective. The shared `apiClient` (ky) uses the
      // absolute prefixUrl with bearer auth and is unaffected.
      proxy: env.VITE_API_BASE_URL
        ? {
            "/api": {
              target: env.VITE_API_BASE_URL,
              changeOrigin: true,
            },
          }
        : undefined,
    },
  };
});
