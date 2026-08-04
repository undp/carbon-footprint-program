# Asistente virtual (chatbot)

- **slug:** asistente-virtual
- **fuente:** codigo
- **estado:** pendiente
- **acceso:** transversal; **desactivado por flag** (`CHATBOT_ENABLED`)

## Propósito

Widget flotante de chat asistido por IA, disponible en toda la app. Actualmente es una base
técnica **dormida / desactivada por feature flag**; no es aún un módulo de usuario activo.

## Rutas

- Sin ruta propia; componente transversal (`apps/web/src/components/Chatbot/ChatbotWidget.tsx:56+`).

## Pantallas / vistas

- Burbuja/widget flotante: enviar mensaje, detener respuesta en streaming, nueva conversación, minimizar (cuando está habilitado).

## Acciones principales

- (Cuando esté habilitado) conversar, iniciar nueva conversación, detener streaming.

## Entidades

- `ChatbotChatConversation` → `ChatbotChatMessage`; corpus `ChatbotCorpusSource` → `ChatbotCorpusChunk`, `ChatbotCorpusIngestRun` (`schema.prisma:1259-1370`, marcado como base dormida).

## Estados / badges

- `CorpusSourceStatus`: DRAFT | ACTIVE | OUTDATED (corpus, dormido).

## Referencias de código

- `apps/web/src/components/Chatbot/ChatbotWidget.tsx:56+`
- API: `apps/api/src/routes/api/chatbot/index.ts:12-18` (privado permisivo; sesión anónima vía cookie; apagado por `CHATBOT_ENABLED`)
- schema: `packages/database/src/prisma/schema.prisma:1259-1370`

## Evidencia

- **código:** componente, endpoint y schema (comentario que lo marca como base dormida).
- **navegación:** no verificado en vivo (deshabilitado por flag en el entorno).

## Dudas abiertas

- ¿Se incluye en el manual? Hoy está apagado; probablemente "próximamente". No documentar como funcionalidad activa hasta habilitar el flag.
