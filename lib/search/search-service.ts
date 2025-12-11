import { PlatformType, SearchResult, AggregatedSearchResult, UnifiedSupplier, UnifiedProduct } from '@/lib/platforms/types';

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

    const data = await response.json();

    // Normalize response: Alibaba returns 'products', MIC returns 'results'
    // Both are arrays of UnifiedProduct
    const productList: UnifiedProduct[] = data.products || data.results || [];
    const totalCount = data.totalCount;
    const hasMore = data.hasMore ?? false;

    // Group the flat product list into UnifiedSuppliers
    const groupedSuppliers = groupProductsIntoSuppliers(productList, platform);

    return {
      platform,
      success: true,
      results: groupedSuppliers,
      totalCount, // This might be total PRODUCTS, not suppliers. UI should handle ambiguous total counts gracefully.
      page: data.page || page,
      hasMore
    };

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
 * Helper to group a flat list of products into UnifiedSupplier objects
 */
function groupProductsIntoSuppliers(products: UnifiedProduct[], platform: PlatformType): UnifiedSupplier[] {
  const supplierMap = new Map<string, UnifiedSupplier>();

  products.forEach(product => {
    // Create a unique key for the supplier. Using name + platform to be safe.
    // Some suppliers might not have an ID in the product response, so fallback to name.
    const supplierName = product.supplier.name || 'Unknown Supplier';
    const supplierKey = `${platform}-${product.supplier.id || supplierName}`;

    if (!supplierMap.has(supplierKey)) {
      supplierMap.set(supplierKey, {
        id: product.supplier.id || `sup-${Date.now()}-${Math.random()}`,
        platform: platform,
        name: supplierName,
        // Taking the first product's price/currency as a representative (or could be range)
        // But UnifiedSupplier price is usually for the supplier entity (maybe empty)
        price: null,
        currency: product.currency,
        moq: null,
        images: [], // Supplier generic images (logo etc) - usually not in product response, can leave empty
        products: [],
        supplier: {
          id: product.supplier.id || '',
          name: supplierName,
          location: product.supplier.location,
          verification: product.supplier.badges || [],
          url: product.supplier.url
        },
        url: product.supplier.url, // Supplier profile URL
        platformSpecific: {} // Could store raw supplier data here if available
      });
    }

    const supplier = supplierMap.get(supplierKey)!;
    supplier.products.push(product);
  });

  return Array.from(supplierMap.values());
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
