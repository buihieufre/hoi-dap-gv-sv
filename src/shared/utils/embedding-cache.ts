/**
 * In-memory cache for embeddings to avoid regenerating for same queries
 * Uses LRU eviction policy
 */

interface CacheEntry {
  embedding: number[];
  timestamp: number;
}

class EmbeddingCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize: number = 1000; // Maximum number of cached embeddings
  private ttl: number = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  /**
   * Generate cache key from text (normalized)
   */
  private getCacheKey(text: string): string {
    // Normalize text: lowercase, trim, remove extra spaces
    return text
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ")
      .substring(0, 200); // Limit key length
  }

  /**
   * Get embedding from cache if exists and not expired
   */
  get(text: string): number[] | null {
    const key = this.getCacheKey(text);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    const now = Date.now();
    if (now - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.embedding;
  }

  /**
   * Store embedding in cache
   */
  set(text: string, embedding: number[]): void {
    const key = this.getCacheKey(text);

    // If cache is full, remove oldest entry (LRU)
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      embedding,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear expired entries
   */
  clearExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttl: this.ttl,
    };
  }
}

// Singleton instance
export const embeddingCache = new EmbeddingCache();

// Clean up expired entries every hour
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    embeddingCache.clearExpired();
  }, 60 * 60 * 1000); // Every hour
}

