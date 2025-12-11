/**
 * Jest Test Setup
 * Global setup for all tests
 */

// Mock environment variables
process.env.JWT_SECRET = "test-jwt-secret-key-for-testing";
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test_db";
process.env.EMBEDDING_PROVIDER = "gemini";
process.env.GEMINI_API_KEY = "test-gemini-api-key";
process.env.OPENAI_API_KEY = "test-openai-api-key";

// Global test timeout
jest.setTimeout(10000);

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Keep error for debugging
  error: console.error,
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Export empty object to make this a module
export {};

