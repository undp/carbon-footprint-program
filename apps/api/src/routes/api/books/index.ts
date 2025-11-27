import type { FastifyZodInstance } from "../../../types/fastify.js";

import { createBookRoute } from "../../../features/books/createBook/createBookRoute.js";
import { getBookByIdRoute } from "../../../features/books/getBookById/getBookByIdRoute.example.js";

export default function booksRoutes(fastify: FastifyZodInstance) {
  getBookByIdRoute(fastify);
  createBookRoute(fastify);
}
