/**
 * Firecrawl concurrency control
 * All Firecrawl API requests should go through this queue
 */

// App-wide concurrency limit for Firecrawl requests
export const FIRECRAWL_CONCURRENCY_LIMIT = 2;

type QueuedTask<T> = {
    fn: () => Promise<T>;
    resolve: (value: T) => void;
    reject: (error: Error) => void;
};

class FirecrawlQueue {
    private queue: QueuedTask<unknown>[] = [];
    private activeCount = 0;
    private readonly maxConcurrency: number;

    constructor(maxConcurrency: number = FIRECRAWL_CONCURRENCY_LIMIT) {
        this.maxConcurrency = maxConcurrency;
    }

    /**
     * Add a task to the queue and return a promise for its result
     */
    async add<T>(fn: () => Promise<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            this.queue.push({
                fn,
                resolve: resolve as (value: unknown) => void,
                reject,
            });
            this.processQueue();
        });
    }

    private async processQueue(): Promise<void> {
        if (this.activeCount >= this.maxConcurrency || this.queue.length === 0) {
            return;
        }

        const task = this.queue.shift();
        if (!task) return;

        this.activeCount++;

        try {
            const result = await task.fn();
            task.resolve(result);
        } catch (error) {
            task.reject(error instanceof Error ? error : new Error(String(error)));
        } finally {
            this.activeCount--;
            this.processQueue();
        }
    }

    /**
     * Get current queue stats
     */
    getStats() {
        return {
            active: this.activeCount,
            queued: this.queue.length,
            maxConcurrency: this.maxConcurrency,
        };
    }
}

// Singleton instance for app-wide use
export const firecrawlQueue = new FirecrawlQueue(FIRECRAWL_CONCURRENCY_LIMIT);
