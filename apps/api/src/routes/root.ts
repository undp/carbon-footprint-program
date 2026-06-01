import type { FastifyZodInstance } from "@/types/fastify.js";
import { APP_VERSION } from "@/config/environment.js";

// Gear icon, reused both as the animated graphic and the (inline) favicon.
const GEAR_SVG_PATH =
  "M19.14 12.94c.04-.3.06-.61.06-.94c0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6s3.6 1.62 3.6 3.6s-1.62 3.6-3.6 3.6z";

/**
 * Static status page served at `GET /`. Replaces the default 404 with a
 * human-friendly "the API is running" page. The favicon is an inline SVG
 * data-URI so it works without static-file serving.
 */
function buildStatusPage(): string {
  const gearSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="${GEAR_SVG_PATH}"/></svg>`;
  const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#4dabf7"><path d="${GEAR_SVG_PATH}"/></svg>`;
  const favicon = `data:image/svg+xml,${encodeURIComponent(faviconSvg)}`;

  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <title>API · Huella Latam</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" type="image/svg+xml" href="${favicon}" />
    <style>
      body {
        margin: 0;
        padding: 0;
        background-color: #1e1e1e;
      }
      .container {
        font-family: Arial, sans-serif;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        height: 100vh;
        margin: 0;
        background-color: #1e1e1e;
        color: #e0e0e0;
      }
      h1 {
        color: #ffffff;
        margin: 10px auto;
      }
      p {
        color: #cccccc;
      }
      .version {
        color: #888888;
        font-size: 0.85rem;
      }
      a {
        color: #4dabf7;
        text-decoration: none;
      }
      a:hover {
        text-decoration: underline;
      }
      .gear {
        width: 80px;
        height: 80px;
        margin: 10px auto;
        animation: spin 4s linear infinite;
        color: #4dabf7;
        will-change: transform;
      }
      @media (prefers-reduced-motion: reduce) {
        .gear {
          animation: none;
        }
      }
      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }
    </style>
  </head>
  <body>
    <main>
      <div class="container">
        <div class="gear">${gearSvg}</div>
        <h1>API Huella Latam</h1>
        <p>El servicio está en línea. Comprueba la conexión a la base de datos en <a href="/health">/health</a></p>
        <p class="version">Versión ${APP_VERSION ?? "unknown"}</p>
      </div>
    </main>
  </body>
</html>`;
}

/**
 * Root route — serves a friendly status page instead of a 404 at `GET /`.
 */
export default function rootRoutes(fastify: FastifyZodInstance) {
  fastify.get("/", { schema: { hide: true } }, async (_request, reply) => {
    return reply.type("text/html; charset=utf-8").send(buildStatusPage());
  });
}
