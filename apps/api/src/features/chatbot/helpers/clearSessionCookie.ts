import type { FastifyReply } from "fastify";
import { CHATBOT_SESSION_COOKIE_NAME, baseCookieOptions } from "./identity.js";

// Reuse baseCookieOptions so the clearing cookie mirrors the set cookie's
// attributes (notably SameSite/Secure, which differ prod vs dev). A clear whose
// attributes diverge from the original is fragile — mirror, then override
// maxAge to 0 to expire it.
export const clearSessionCookie = (reply: FastifyReply): void => {
  reply.setCookie(CHATBOT_SESSION_COOKIE_NAME, "", {
    ...baseCookieOptions(),
    maxAge: 0,
  });
};
