import fp from "fastify-plugin";
import { registerBooksRoutes } from "./features/books/booksRoute.js";

export const registerRoutes = fp(async (fastify) => {
  // Registrar rutas de books
  await fastify.register(registerBooksRoutes, { prefix: "/books" });

  // Aquí puedes agregar más features en el futuro
  // await fastify.register(registerUsersRoutes, { prefix: "/users" });
});
