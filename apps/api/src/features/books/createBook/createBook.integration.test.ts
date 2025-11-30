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
  createBookDataWithSpecialCharacters,
} from "./createBookFactory.js";
import type { CreateBookResponse } from "./createBookSchema.example.js";
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
    app = testApp.app;
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

    it("debería incluir slug y metadata en la respuesta", async () => {
      const bookData = createBookData({ title: "Test Book Title" });

      const response = await app.inject({
        method: "POST",
        url: "/api/books",
        payload: bookData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateBookResponse;
      expect(body.slug).toBeDefined();
      expect(body.slug).toBe("test-book-title");
      expect(body.metadata).toBeDefined();
      expect(body.metadata?.titleLength).toBe(bookData.title.length);
      expect(body.metadata?.authorLength).toBe(bookData.author.length);
    });

    it("debería crear el registro de historial correctamente", async () => {
      const bookData = createBookData();

      const response = await app.inject({
        method: "POST",
        url: "/api/books",
        payload: bookData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateBookResponse;

      // Verificar que el historial se creó
      const history = await prisma.bookHistory.findFirst({
        where: { bookId: body.id },
      });

      expect(history).toBeDefined();
      expect(history?.action).toBe("created");
      expect(history?.bookId).toBe(body.id);
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

      expect(response.statusCode).toBe(500); // El UseCase lanza error que se convierte en 500
      const body = JSON.parse(response.body) as { message: string };
      expect(body.message).toContain("already exists");
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

    it("debería rechazar títulos con caracteres inválidos", async () => {
      const bookData = createBookData({ title: "Test@#$%Book" });

      const response = await app.inject({
        method: "POST",
        url: "/api/books",
        payload: bookData,
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body) as { message: string };
      expect(body.message).toContain("invalid characters");
    });

    it("debería rechazar autores con caracteres inválidos", async () => {
      const bookData = createBookData({ author: "Author@#$%Name" });

      const response = await app.inject({
        method: "POST",
        url: "/api/books",
        payload: bookData,
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body) as { message: string };
      expect(body.message).toContain("invalid characters");
    });
  });

  describe("Transformaciones y normalización", () => {
    it("debería normalizar espacios en blanco en título y autor", async () => {
      const bookData = createBookDataWithSpecialCharacters();

      const response = await app.inject({
        method: "POST",
        url: "/api/books",
        payload: bookData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateBookResponse;

      // Verificar que los espacios fueron normalizados (trimmed)
      expect(body.title).toBe(bookData.title.trim());
      expect(body.author).toBe(bookData.author.trim());
    });

    it("debería generar slug correctamente desde el título", async () => {
      const testCases = [
        {
          title: "El Quijote de la Mancha",
          expectedSlug: "el-quijote-de-la-mancha",
        },
        { title: "1984", expectedSlug: "1984" },
        { title: "Cien años de soledad", expectedSlug: "cien-anos-de-soledad" },
        {
          title: "Harry Potter & The Philosopher's Stone",
          expectedSlug: "harry-potter-the-philosophers-stone",
        },
      ];

      for (const testCase of testCases) {
        // Limpiar antes de cada test case
        await cleanBookData(prisma);

        const response = await app.inject({
          method: "POST",
          url: "/api/books",
          payload: createBookDataWithTitle(testCase.title),
        });

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.body) as CreateBookResponse;
        expect(body.slug).toBe(testCase.expectedSlug);
      }
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

    it("debería usar transacciones para crear libro e historial", async () => {
      const bookData = createBookData();

      const response = await app.inject({
        method: "POST",
        url: "/api/books",
        payload: bookData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body) as CreateBookResponse;

      // Verificar que tanto el libro como el historial existen
      const book = await prisma.book.findUnique({
        where: { id: body.id },
        include: { history: true },
      });

      expect(book).toBeDefined();
      expect(book?.history).toHaveLength(1);
      expect(book?.history[0]?.action).toBe("created");
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
