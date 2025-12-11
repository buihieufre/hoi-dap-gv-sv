import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { embeddingCache } from "./embedding-cache";

// Embedding provider type
export type EmbeddingProvider = "openai" | "gemini";

// Get embedding provider from env or default to gemini
export function getEmbeddingProvider(): EmbeddingProvider {
  const provider = process.env.EMBEDDING_PROVIDER?.toLowerCase() || "gemini";
  return provider === "openai" ? "openai" : "gemini";
}

// Get embedding dimensions based on provider
export function getEmbeddingDimensions(): number {
  const provider = getEmbeddingProvider();
  if (provider === "openai") {
    return 1536; // text-embedding-ada-002
  } else {
    // Gemini: text-embedding-004 has 768 dimensions
    // gemini-embedding-001 can be configured, default to 768
    return parseInt(process.env.GEMINI_EMBEDDING_DIMENSIONS || "768", 10);
  }
}

// Singleton OpenAI client to reuse connections
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }
    openaiClient = new OpenAI({
      apiKey,
      maxRetries: 2,
      timeout: 30000, // 30 seconds timeout
    });
  }
  return openaiClient;
}

// Singleton Gemini client to reuse connections
let geminiClient: GoogleGenerativeAI | null = null;

function getGeminiClient(): GoogleGenerativeAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set");
    }
    geminiClient = new GoogleGenerativeAI(apiKey);
  }
  return geminiClient;
}

/**
 * Generate embedding vector for text using OpenAI or Google Gemini
 * Supports both providers with automatic fallback
 * Includes caching to avoid regenerating same embeddings
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error("Text input is empty");
  }

  // Check cache first
  const cached = embeddingCache.get(text);
  if (cached) {
    console.log(`[Embeddings] Cache hit for text (length: ${text.length})`);
    return cached;
  }

  const provider = getEmbeddingProvider();
  const expectedDimensions = getEmbeddingDimensions();

  try {
    // Extract plain text from Editor.js JSON if needed
    const plainText = extractPlainText(text);

    if (!plainText || plainText.trim().length === 0) {
      throw new Error("Extracted plain text is empty");
    }

    console.log(
      `[Embeddings] Generating embedding using ${provider.toUpperCase()} for text (length: ${
        plainText.length
      })`
    );

    let embedding: number[];

    if (provider === "openai") {
      embedding = await generateOpenAIEmbedding(plainText, expectedDimensions);
    } else {
      embedding = await generateGeminiEmbedding(plainText, expectedDimensions);
    }

    // Validate embedding dimensions
    if (!embedding || embedding.length !== expectedDimensions) {
      throw new Error(
        `Invalid embedding length: ${
          embedding?.length || 0
        }, expected ${expectedDimensions}`
      );
    }

    // Cache the result
    embeddingCache.set(text, embedding);

    console.log(
      `[Embeddings] Successfully generated embedding (length: ${embedding.length})`
    );
    return embedding;
  } catch (error) {
    console.error(`[Embeddings] Error generating embedding (${provider}):`, {
      error,
      message: error instanceof Error ? error.message : String(error),
      textLength: text?.length || 0,
      provider,
    });

    // Try fallback if primary provider fails
    if (provider === "gemini") {
      console.log("[Embeddings] Attempting fallback to OpenAI...");
      try {
        const fallbackEmbedding = await generateOpenAIEmbedding(
          extractPlainText(text),
          1536
        );
        embeddingCache.set(text, fallbackEmbedding);
        return fallbackEmbedding;
      } catch (fallbackError) {
        console.error("[Embeddings] Fallback also failed:", fallbackError);
      }
    }

    if (error instanceof Error && error.message.includes("401")) {
      throw new Error(
        `${provider.toUpperCase()} API key is invalid or expired`
      );
    }
    if (error instanceof Error && error.message.includes("429")) {
      throw new Error(
        `${provider.toUpperCase()} API rate limit exceeded. Please try again later.`
      );
    }
    if (error instanceof Error && error.message.includes("500")) {
      throw new Error(
        `${provider.toUpperCase()} API server error. Please try again later.`
      );
    }

    throw new Error(
      `Failed to generate embedding: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Generate embedding using OpenAI
 */
async function generateOpenAIEmbedding(
  text: string,
  expectedDimensions: number
): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }

  const openai = getOpenAIClient();
  const response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: text.substring(0, 8000), // Limit to 8000 chars (OpenAI limit)
  });

  if (!response.data || response.data.length === 0) {
    throw new Error("No embedding data returned from OpenAI");
  }

  return response.data[0].embedding;
}

/**
 * Generate embedding using Google Gemini
 */
async function generateGeminiEmbedding(
  text: string,
  expectedDimensions: number
): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }

  const genAI = getGeminiClient();

  // Use text-embedding-004 model (768 dimensions) or gemini-embedding-001
  const modelName = process.env.GEMINI_EMBEDDING_MODEL || "text-embedding-004";

  // For gemini-embedding-001, we can specify output dimensions
  // For text-embedding-004, it's fixed at 768
  const taskType =
    process.env.GEMINI_EMBEDDING_TASK_TYPE || "RETRIEVAL_DOCUMENT";

  try {
    const model = genAI.getGenerativeModel({ model: modelName });

    // Gemini embedding API - pass text as string directly
    // The API accepts string, array of strings, or Content format
    const textToEmbed = text.substring(0, 2048); // Gemini limit: 2048 tokens

    // Try different API formats based on model
    let result: any;

    if (modelName === "text-embedding-004") {
      // text-embedding-004 accepts string directly
      result = await model.embedContent(textToEmbed);
    } else {
      // gemini-embedding-001 might need different format
      result = await model.embedContent({
        content: { role: "user", parts: [{ text: textToEmbed }] },
        taskType: taskType as any,
      });
    }

    // Extract embedding values
    const embedding = result.embedding?.values || result.embedding || [];

    if (!embedding || embedding.length === 0) {
      throw new Error("No embedding data returned from Gemini");
    }

    // If dimensions don't match expected, log warning but return anyway
    if (embedding.length !== expectedDimensions) {
      console.warn(
        `[Embeddings] Gemini returned ${embedding.length} dimensions, expected ${expectedDimensions}. ` +
          `Update GEMINI_EMBEDDING_DIMENSIONS env var or schema.`
      );
    }

    return embedding;
  } catch (error) {
    // If text-embedding-004 fails, try gemini-embedding-001
    if (modelName === "text-embedding-004") {
      console.log("[Embeddings] Trying gemini-embedding-001 as fallback...");
      try {
        const fallbackModel = genAI.getGenerativeModel({
          model: "gemini-embedding-001",
        });
        const fallbackResult = await fallbackModel.embedContent({
          content: { role: "user", parts: [{ text: text.substring(0, 2048) }] },
        });
        return fallbackResult.embedding?.values || [];
      } catch (fallbackError) {
        console.error(
          "[Embeddings] Fallback model also failed:",
          fallbackError
        );
      }
    }
    throw error;
  }
}

/**
 * Extract plain text from Editor.js JSON content
 * Improved extraction to capture more content for better embeddings
 */
function extractPlainText(content: string): string {
  if (!content || typeof content !== "string") {
    return "";
  }

  try {
    // Try to parse as JSON (Editor.js format)
    const parsed = JSON.parse(content);
    if (parsed && parsed.blocks && Array.isArray(parsed.blocks)) {
      const textParts: string[] = [];

      parsed.blocks.forEach((block: any) => {
        if (block.type === "paragraph") {
          const text = block.data?.text || "";
          if (text.trim()) textParts.push(text);
        } else if (block.type === "header") {
          const text = block.data?.text || "";
          const level = block.data?.level || 1;
          // Headers are important, include them
          if (text.trim()) textParts.push(text);
        } else if (block.type === "list") {
          const items = block.data?.items || [];
          items.forEach((item: string) => {
            if (item && item.trim()) textParts.push(item);
          });
        } else if (block.type === "quote") {
          const text = block.data?.text || "";
          if (text.trim()) textParts.push(text);
        } else if (block.type === "code") {
          const code = block.data?.code || "";
          // Include code comments and variable names for better matching
          if (code.trim()) textParts.push(code);
        } else if (block.type === "linkTool") {
          const link = block.data?.link || "";
          const meta = block.data?.meta || {};
          if (link) textParts.push(link);
          if (meta.title) textParts.push(meta.title);
          if (meta.description) textParts.push(meta.description);
        } else if (block.type === "table") {
          const content = block.data?.content || [];
          content.forEach((row: string[]) => {
            row.forEach((cell: string) => {
              if (cell && cell.trim()) textParts.push(cell);
            });
          });
        }
      });

      const extracted = textParts
        .filter((text: string) => text.trim().length > 0)
        .join(" ")
        .trim();

      // Return extracted text or fallback to original if empty
      return extracted || content.replace(/<[^>]*>/g, "").trim();
    }
  } catch (e) {
    // Not JSON, treat as plain text or HTML
  }

  // If not JSON, strip HTML tags and return plain text
  const cleaned = content.replace(/<[^>]*>/g, "").trim();
  return cleaned || content; // Return original if cleaning results in empty string
}

/**
 * Format embedding vector for PostgreSQL pgvector
 * Converts array to string format: '[0.1,0.2,0.3]'
 * Note: PostgreSQL pgvector expects the format without spaces
 */
export function formatEmbeddingForPostgres(embedding: number[]): string {
  if (!embedding || embedding.length === 0) {
    throw new Error("Embedding array is empty");
  }

  // Ensure all values are valid numbers
  const validEmbedding = embedding.map((val) => {
    const num = typeof val === "number" ? val : parseFloat(String(val));
    if (isNaN(num)) {
      throw new Error(`Invalid embedding value: ${val}`);
    }
    return num;
  });

  return `[${validEmbedding.join(",")}]`;
}
