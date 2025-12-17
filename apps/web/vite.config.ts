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
  };
});
