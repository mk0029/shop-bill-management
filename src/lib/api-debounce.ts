/**
 * Global API call debouncing utility
 * Prevents rapid successive API calls that can cause performance issues
 */

interface DebounceEntry {
  timer: NodeJS.Timeout;
  lastCall: number;
}

class ApiDebouncer {
  private debounceMap = new Map<string, DebounceEntry>();
  private readonly DEFAULT_DELAY = 1000; // 1 second default delay

  /**
   * Debounce an API call by key
   * @param key - Unique identifier for the API call
   * @param fn - Function to execute
   * @param delay - Delay in milliseconds (default: 1000ms)
   */
  debounce<T extends (...args: any[]) => any>(
    key: string,
    fn: T,
    delay: number = this.DEFAULT_DELAY
  ): (...args: Parameters<T>) => void {
    return (...args: Parameters<T>) => {
      const now = Date.now();
      const existing = this.debounceMap.get(key);

      // Clear existing timer if it exists
      if (existing) {
        clearTimeout(existing.timer);
      }

      // Set new timer
      const timer = setTimeout(() => {
        fn(...args);
        this.debounceMap.delete(key);
      }, delay);

      this.debounceMap.set(key, { timer, lastCall: now });
    };
  }

  /**
   * Check if an API call was made recently
   * @param key - Unique identifier for the API call
   * @param threshold - Time threshold in milliseconds (default: 2000ms)
   */
  wasCalledRecently(key: string, threshold: number = 2000): boolean {
    const existing = this.debounceMap.get(key);
    if (!existing) return false;

    const now = Date.now();
    return now - existing.lastCall < threshold;
  }

  /**
   * Cancel a debounced call
   * @param key - Unique identifier for the API call
   */
  cancel(key: string): void {
    const existing = this.debounceMap.get(key);
    if (existing) {
      clearTimeout(existing.timer);
      this.debounceMap.delete(key);
    }
  }

  /**
   * Clear all debounced calls
   */
  clearAll(): void {
    this.debounceMap.forEach(({ timer }) => clearTimeout(timer));
    this.debounceMap.clear();
  }
}

// Global instance
export const apiDebouncer = new ApiDebouncer();

// Convenience functions for common API calls
export const debouncedFetch = {
  products: apiDebouncer.debounce("fetch-products", () => {}, 1000),
  bills: apiDebouncer.debounce("fetch-bills", () => {}, 1000),
  inventory: apiDebouncer.debounce("fetch-inventory", () => {}, 1000),
  categories: apiDebouncer.debounce("fetch-categories", () => {}, 1000),
  brands: apiDebouncer.debounce("fetch-brands", () => {}, 1000),
};
