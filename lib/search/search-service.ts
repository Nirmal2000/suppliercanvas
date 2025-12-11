import { PlatformType, SearchResult, AggregatedSearchResult } from '@/lib/platforms/types';

/**
 * Search a single platform
 */
export async function searchPlatform(
  platform: PlatformType,
  query: string,
  page: number = 1
): Promise<SearchResult> {
  try {
    let endpoint = '';
    if (platform === 'alibaba') {
      endpoint = '/api/search/alibaba/product';
    } else if (platform === 'madeinchina') {
      endpoint = '/api/search/made-in-china/product';
    } else {
      // Fallback for any other platforms
      endpoint = `/api/search/${platform}`;
    }

    const url = `${endpoint}?query=${encodeURIComponent(query)}&page=${page}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`${platform} API returned ${response.status}`);
    }

    const data: SearchResult = await response.json();
    return data;
  } catch (error) {
    console.error(`Error searching ${platform}:`, error);
    return {
      platform,
      success: false,
      results: [],
      error: error instanceof Error ? error.message : 'Search failed',
      page,
      hasMore: false
    };
  }
}

/**
 * Search all specified platforms in parallel
 */
export async function searchAllPlatforms(
  query: string,
  platforms: PlatformType[] = ['alibaba', 'madeinchina'],
  page: number = 1
): Promise<AggregatedSearchResult> {
  // Execute all searches in parallel using Promise.all
  const searchPromises = platforms.map((platform) =>
    searchPlatform(platform, query, page)
  );

  const results = await Promise.all(searchPromises);

  return {
    query,
    results,
    timestamp: Date.now()
  };
}

/**
 * Get a summary of search results
 */
export function getSearchSummary(aggregatedResult: AggregatedSearchResult): {
  totalResults: number;
  successfulPlatforms: number;
  failedPlatforms: number;
  platformResults: Record<PlatformType, number>;
} {
  const summary = {
    totalResults: 0,
    successfulPlatforms: 0,
    failedPlatforms: 0,
    platformResults: {} as Record<PlatformType, number>
  };

  aggregatedResult.results.forEach((result) => {
    if (result.success) {
      summary.successfulPlatforms++;
      summary.totalResults += result.results.length;
      summary.platformResults[result.platform] = result.results.length;
    } else {
      summary.failedPlatforms++;
      summary.platformResults[result.platform] = 0;
    }
  });

  return summary;
}
