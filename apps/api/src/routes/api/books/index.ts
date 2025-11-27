import type { FastifyInstance } from "fastify";

import { createBookRoute } from "../../../features/books/createBook/createBookRoute.js";
import { getBookByIdRoute } from "../../../features/books/getBookById/getBookByIdRoute.example.js";

export default function booksRoutes(fastify: FastifyInstance) {
  getBookByIdRoute(fastify);
  createBookRoute(fastify);
}
