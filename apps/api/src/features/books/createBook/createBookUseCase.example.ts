import type { PrismaClient } from "@repo/database";
import type { CreateBookBody } from "./createBookSchema.example.js";
import { createBookRepository } from "./createBookRepository.example.js";

// --------------------------------------------------------------------------------
// OBJECTIVE: Orchestrate complex business logic for creating a book.
// EXPLANATION:
// This UseCase coordinates multiple steps: validation, normalization, transformation,
// persistence, and response enrichment. It encapsulates all business rules and
// ensures they are applied consistently.
// --------------------------------------------------------------------------------

interface NormalizedBookData {
  title: string;
  author: string;
}

interface TransformedBookData extends NormalizedBookData {
  slug: string;
  metadata: {
    titleLength: number;
    authorLength: number;
    createdAt: Date;
  };
}

export class CreateBookUseCase {
  constructor(private prisma: PrismaClient) {}

  /**
   * Main entry point that orchestrates the entire book creation process.
   */
  async execute(data: CreateBookBody) {
    // Step 1: Validate business rules
    await this.validate(data);

    // Step 2: Normalize input data
    const normalized = this.normalize(data);

    // Step 3: Apply transformations
    const transformed = this.transform(normalized);

    // Step 4: Persist to database
    const book = await this.persist(transformed);

    // Step 5: Enrich response
    return this.enrich(book);
  }

  /**
   * Validates business rules before processing.
   * Throws errors if validation fails.
   */
  private async validate(data: CreateBookBody): Promise<void> {
    // Check if title already exists
    const existingBook = await this.prisma.book.findUnique({
      where: { title: data.title.trim() },
    });

    if (existingBook) {
      throw new Error(`Book with title "${data.title}" already exists`);
    }

    // Validate title format (allows Unicode letters including accented characters)
    const titleRegex = /^[\p{L}\p{N}\s\-'.,:;!?()&]+$/u;
    if (!titleRegex.test(data.title)) {
      throw new Error(
        "Title contains invalid characters. Only letters, numbers, spaces, and basic punctuation are allowed."
      );
    }

    // Validate author format (allows Unicode letters including accented characters)
    const authorRegex = /^[\p{L}\s\-'.,]+$/u;
    if (!authorRegex.test(data.author)) {
      throw new Error(
        "Author name contains invalid characters. Only letters, spaces, hyphens, and apostrophes are allowed."
      );
    }
  }

  /**
   * Normalizes input data (trimming, case handling, etc.)
   */
  private normalize(data: CreateBookBody): NormalizedBookData {
    return {
      title: data.title.trim(),
      author: data.author.trim(),
    };
  }

  /**
   * Applies business transformations (slug generation, metadata, etc.)
   */
  private transform(data: NormalizedBookData): TransformedBookData {
    // Generate slug from title
    const slug = this.generateSlug(data.title);

    // Create metadata
    const metadata = {
      titleLength: data.title.length,
      authorLength: data.author.length,
      createdAt: new Date(),
    };

    return {
      ...data,
      slug,
      metadata,
    };
  }

  /**
   * Generates a URL-friendly slug from a title.
   * Normalizes accented characters (ñ -> n, á -> a, etc.)
   */
  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .normalize("NFD") // Decompose characters (á -> a + ´)
      .replace(/[\u0300-\u036f]/g, "") // Remove diacritics (accents)
      .replace(/ñ/g, "n") // Handle ñ separately (not decomposed by NFD)
      .replace(/[^\w\s-]/g, "") // Remove remaining special characters
      .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
  }

  /**
   * Persists the book to the database using the repository.
   */
  private async persist(data: TransformedBookData) {
    return createBookRepository.createWithHistory(this.prisma, {
      title: data.title,
      author: data.author,
    });
  }

  /**
   * Enriches the response with calculated fields.
   */
  private enrich(
    book: Awaited<ReturnType<typeof createBookRepository.createWithHistory>>
  ) {
    // Generate slug for response (could be stored in DB, but for now we calculate it)
    const slug = this.generateSlug(book.title);

    return {
      ...book,
      slug,
      metadata: {
        titleLength: book.title.length,
        authorLength: book.author.length,
      },
    };
  }
}
