import { getBookByIdRoute } from "./getBookById/getBookByIdRoute.example.js";
import { createBookRoute } from "./createBook/createBookRoute.js";
import type { FastifyInstance } from "fastify";

export const registerBooksRoutes = (fastify: FastifyInstance) => {
  // Registrar todas las rutas de la feature books
  getBookByIdRoute(fastify);
  createBookRoute(fastify);

  // Aquí puedes agregar más rutas de books en el futuro
  // updateBookRoute(fastify);
  // deleteBookRoute(fastify);
};
