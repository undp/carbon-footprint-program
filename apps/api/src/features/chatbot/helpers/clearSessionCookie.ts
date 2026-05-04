import type { FastifyReply } from "fastify";
import { IS_PROD } from "@/config/environment.js";
import {
  CHATBOT_SESSION_COOKIE_NAME,
  CHATBOT_SESSION_COOKIE_PATH,
} from "./identity.js";

export const clearSessionCookie = (reply: FastifyReply): void => {
  reply.setCookie(CHATBOT_SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: IS_PROD,
    path: CHATBOT_SESSION_COOKIE_PATH,
    maxAge: 0,
  });
};
