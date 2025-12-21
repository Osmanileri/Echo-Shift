/**
 * Sprite Manager - Spirit of the Resonance
 * 
 * Manages Pokemon sprite textures with LRU caching for memory efficiency.
 * Automatically disposes unused sprites to keep RAM usage low.
 * 
 * Features:
 * - LRU (Least Recently Used) cache with configurable size
 * - Automatic disposal of stale sprites
 * - Preloading for smooth transitions
 * - Memory usage tracking
 */

/**
 * Cached sprite entry with metadata
 */
interface CachedSprite {
    image: HTMLImageElement;
    url: string;
    lastAccessTime: number;
    loadTime: number;
    size: number; // Estimated memory size in bytes
}

/**
 * Sprite Manager Configuration
 */
interface SpriteManagerConfig {
    maxCacheSize: number;      // Max sprites to keep in memory
    staleThresholdMs: number;  // Time before sprite is considered stale
    preloadCount: number;      // Number of sprites to preload ahead
}

/**
 * Default configuration optimized for mobile
 */
const DEFAULT_CONFIG: SpriteManagerConfig = {
    maxCacheSize: 20,           // Keep 20 sprites max
    staleThresholdMs: 60000,    // 1 minute stale threshold
    preloadCount: 3,            // Preload 3 sprites ahead
};

/**
 * Sprite Manager class implementing LRU cache
 */
class SpriteManagerClass {
    private cache: Map<string, CachedSprite> = new Map();
    private config: SpriteManagerConfig;
    private loadingPromises: Map<string, Promise<HTMLImageElement>> = new Map();

    constructor(config: Partial<SpriteManagerConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * Get a sprite from cache or load it
     */
    async getSprite(url: string): Promise<HTMLImageElement | null> {
        if (!url) return null;

        // Check cache first
        const cached = this.cache.get(url);
        if (cached) {
            // Update last access time (LRU touch)
            cached.lastAccessTime = Date.now();
            return cached.image;
        }

        // Check if already loading
        const loadingPromise = this.loadingPromises.get(url);
        if (loadingPromise) {
            return loadingPromise;
        }

        // Load new sprite
        return this.loadSprite(url);
    }

    /**
     * Get sprite synchronously (returns null if not cached)
     */
    getSpriteSync(url: string): HTMLImageElement | null {
        if (!url) return null;

        const cached = this.cache.get(url);
        if (cached) {
            cached.lastAccessTime = Date.now();
            return cached.image;
        }

        // Trigger async load if not cached
        this.loadSprite(url).catch(() => { });

        return null;
    }

    /**
     * Load a sprite and add to cache
     */
    private async loadSprite(url: string): Promise<HTMLImageElement> {
        const loadPromise = new Promise<HTMLImageElement>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => {
                const now = Date.now();
                const entry: CachedSprite = {
                    image: img,
                    url,
                    lastAccessTime: now,
                    loadTime: now,
                    size: this.estimateImageSize(img),
                };

                // Evict old entries if needed
                this.evictIfNeeded();

                // Add to cache
                this.cache.set(url, entry);
                this.loadingPromises.delete(url);

                resolve(img);
            };

            img.onerror = () => {
                this.loadingPromises.delete(url);
                reject(new Error(`Failed to load sprite: ${url}`));
            };

            img.src = url;
        });

        this.loadingPromises.set(url, loadPromise);
        return loadPromise;
    }

    /**
     * Evict least recently used sprites if cache is full
     */
    private evictIfNeeded(): void {
        while (this.cache.size >= this.config.maxCacheSize) {
            // Find LRU entry
            let lruKey: string | null = null;
            let lruTime = Infinity;

            this.cache.forEach((entry, key) => {
                if (entry.lastAccessTime < lruTime) {
                    lruTime = entry.lastAccessTime;
                    lruKey = key;
                }
            });

            if (lruKey) {
                this.dispose(lruKey);
            } else {
                break;
            }
        }
    }

    /**
     * Dispose a specific sprite
     */
    dispose(url: string): void {
        const entry = this.cache.get(url);
        if (entry) {
            // Clear image source to help garbage collection
            entry.image.src = '';
            this.cache.delete(url);
        }
    }

    /**
     * Dispose all stale sprites
     */
    disposeStale(): number {
        const now = Date.now();
        let disposedCount = 0;

        this.cache.forEach((entry, key) => {
            if (now - entry.lastAccessTime > this.config.staleThresholdMs) {
                this.dispose(key);
                disposedCount++;
            }
        });

        return disposedCount;
    }

    /**
     * Preload sprites for upcoming characters
     */
    async preload(urls: string[]): Promise<void> {
        const toLoad = urls.slice(0, this.config.preloadCount);
        await Promise.allSettled(toLoad.map(url => this.loadSprite(url)));
    }

    /**
     * Clear entire cache
     */
    clearAll(): void {
        this.cache.forEach((entry, key) => {
            entry.image.src = '';
        });
        this.cache.clear();
        this.loadingPromises.clear();
    }

    /**
     * Estimate image memory size in bytes
     */
    private estimateImageSize(img: HTMLImageElement): number {
        // RGBA = 4 bytes per pixel
        return img.naturalWidth * img.naturalHeight * 4;
    }

    /**
     * Get cache statistics
     */
    getStats(): {
        cachedCount: number;
        loadingCount: number;
        estimatedMemoryMB: number;
    } {
        let totalSize = 0;
        this.cache.forEach(entry => {
            totalSize += entry.size;
        });

        return {
            cachedCount: this.cache.size,
            loadingCount: this.loadingPromises.size,
            estimatedMemoryMB: totalSize / (1024 * 1024),
        };
    }

    /**
     * Check if sprite is cached
     */
    isCached(url: string): boolean {
        return this.cache.has(url);
    }
}

// Export singleton instance
export const SpriteManager = new SpriteManagerClass();

// Export class for testing/custom instances
export { SpriteManagerClass };
export type { CachedSprite, SpriteManagerConfig };

