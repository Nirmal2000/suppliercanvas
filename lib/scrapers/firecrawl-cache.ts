/**
 * Firecrawl Cache - Supabase-based caching for Firecrawl responses
 */

import { createClient } from '@supabase/supabase-js';

// Use service role for direct DB access (no RLS)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

interface CacheEntry {
    url: string;
    html: string;
    created_at: string;
    updated_at: string;
}

/**
 * Get cached HTML for a URL if it exists
 */
export async function getCachedHtml(url: string): Promise<string | null> {
    try {
        const { data, error } = await supabase
            .from('firecrawl_cache')
            .select('html')
            .eq('url', url)
            .single();

        if (error || !data) {
            return null;
        }

        console.log(`[Cache HIT] ${url}`);
        return data.html;
    } catch (err) {
        console.error('[Cache] Error reading cache:', err);
        return null;
    }
}

/**
 * Save HTML to cache for a URL (insert or update)
 */
export async function setCachedHtml(url: string, html: string): Promise<void> {
    try {
        const { error } = await supabase
            .from('firecrawl_cache')
            .upsert(
                { url, html, updated_at: new Date().toISOString() },
                { onConflict: 'url' }
            );

        if (error) {
            console.error('[Cache] Error writing cache:', error);
        } else {
            console.log(`[Cache SAVE] ${url}`);
        }
    } catch (err) {
        console.error('[Cache] Error writing cache:', err);
    }
}

/**
 * Check cache age (optional - for TTL-based invalidation)
 */
export async function getCacheAge(url: string): Promise<number | null> {
    try {
        const { data, error } = await supabase
            .from('firecrawl_cache')
            .select('updated_at')
            .eq('url', url)
            .single();

        if (error || !data) {
            return null;
        }

        const updatedAt = new Date(data.updated_at);
        const now = new Date();
        return now.getTime() - updatedAt.getTime();
    } catch {
        return null;
    }
}
