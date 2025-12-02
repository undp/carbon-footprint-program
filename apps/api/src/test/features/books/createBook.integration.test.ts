import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  setupTestDatabase,
  teardownTestDatabase,
} from "@/test/setup/testcontainers.js";
import { createTestApp } from "@/test/utils/test-app-factory.js";
import { cleanBookData } from "@/test/utils/test-helpers.js";
import {
  createBookData,
  createBookDataWithTitle,
  createInvalidBookData,
} from "@/test/features/books/createBookFactory.js";
import type { CreateBookResponse } from "@/features/books/createBook/createBookSchema.example.js";
import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@repo/database";

describe("POST /api/books - Integration Tests", () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;
  let databaseUrl: string;

  beforeAll(async () => {
    // Setup test database with TestContainers
    const setup = await setupTestDatabase();
    databaseUrl = setup.databaseUrl;

    // Create test app with the test database
    const testApp = await createTestApp(databaseUrl);
    app = testApp;
    prisma = testApp.prisma;
  });

  afterAll(async () => {
    // Cleanup: close app and database connections
    await app.close();
    await prisma.$disconnect();
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    // Clean book data before each test to ensure isolation
    await cleanBookData(prisma);
  });

  describe("Creación exitosa de libro", () => {
    it("debería crear un libro exitosamente con datos válidos", async () => {
      const bookData = createBookData();

      const response = await app.inject({
        method: "POST",
        url: "/api/books",
        payload: bookData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateBookResponse;
      expect(body).toMatchObject({
        title: bookData.title,
        author: bookData.author,
      });
      expect(body.id).toBeDefined();
      expect(body.createdAt).toBeDefined();
      expect(body.updatedAt).toBeDefined();
    });
  });

  describe("Validaciones de negocio", () => {
    it("debería rechazar un libro con título duplicado", async () => {
      const bookData = createBookDataWithTitle("El Quijote");

      // Crear el primer libro
      await app.inject({
        method: "POST",
        url: "/api/books",
        payload: bookData,
      });

      // Intentar crear otro con el mismo título
      const response = await app.inject({
        method: "POST",
        url: "/api/books",
        payload: bookData,
      });

      expect(response.statusCode).toBe(500); // Error por restricción de unicidad en base de datos
    });

    it("debería rechazar datos inválidos (campos vacíos)", async () => {
      const invalidData = createInvalidBookData();

      const response = await app.inject({
        method: "POST",
        url: "/api/books",
        payload: invalidData,
      });

      // Fastify/Zod validation debería rechazar antes de llegar al handler
      expect(response.statusCode).toBe(400);
    });
  });

  describe("Persistencia en base de datos", () => {
    it("debería persistir el libro en la base de datos", async () => {
      const bookData = createBookData();

      const response = await app.inject({
        method: "POST",
        url: "/api/books",
        payload: bookData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateBookResponse;

      // Verificar directamente en la base de datos
      const bookInDb = await prisma.book.findUnique({
        where: { id: body.id },
      });

      expect(bookInDb).toBeDefined();
      expect(bookInDb?.title).toBe(bookData.title);
      expect(bookInDb?.author).toBe(bookData.author);
    });
  });

  describe("Manejo de errores", () => {
    it("debería manejar errores de validación correctamente", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/books",
        payload: {}, // Datos completamente vacíos
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
