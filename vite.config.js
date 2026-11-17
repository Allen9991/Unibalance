import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { createAnthropicProxy } from "./server/anthropicProxy.js";
import { createCourseDocumentImportProxy, createCourseImportProxy } from "./server/courseImport.js";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    base: "./",
    plugins: [
      react(),
      {
        name: "unibalance-anthropic-proxy",
        configureServer(server) {
          server.middlewares.use(
            "/api/anthropic/messages",
            createAnthropicProxy({ apiKey: env.ANTHROPIC_API_KEY }),
          );
          server.middlewares.use(
            "/api/course/import",
            createCourseImportProxy({ apiKey: env.ANTHROPIC_API_KEY }),
          );
          server.middlewares.use(
            "/api/course/import-file",
            createCourseDocumentImportProxy({ apiKey: env.ANTHROPIC_API_KEY }),
          );
        },
      },
    ],
  };
});
