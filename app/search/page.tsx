'use client';

import { useState } from 'react';
import { SearchBar } from '@/components/search/search-bar';
import { ProductGrid } from '@/components/search/product-grid';
import { ProductDetailSheet } from '@/components/search/product-detail-sheet';
import { PlatformFilter } from '@/components/search/platform-filter';
import { AdvancedFilters } from '@/components/search/advanced-filters';
import { UnifiedSupplier, PlatformType, SearchResult, FilterValue } from '@/lib/platforms/types';
import { searchAllPlatforms } from '@/lib/search/search-service';
import { applyFilters } from '@/lib/search/filter-service';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<PlatformType>>(
    new Set(['alibaba', 'madeinchina'])
  );
  const [page, setPage] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterValue[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<UnifiedSupplier | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);

  const handleSearch = async (searchQuery: string) => {
    setQuery(searchQuery);
    setLoading(true);
    setActiveFilters([]); // Reset filters on new search
    setPage(1); // Reset page

    try {
      // Always search all platforms initially to have data ready for filtering
      const platforms: PlatformType[] = ['alibaba', 'madeinchina'];
      const aggregatedResults = await searchAllPlatforms(searchQuery, platforms);
      setResults(aggregatedResults.results);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (isLoadingMore) return;

    setIsLoadingMore(true);
    const nextPage = page + 1;

    try {
      // Only search platforms that have more results
      const platformsToSearch = results
        .filter(r => r.success && r.hasMore)
        .map(r => r.platform);

      if (platformsToSearch.length === 0) {
        setIsLoadingMore(false);
        return;
      }

      const aggregatedResults = await searchAllPlatforms(query, platformsToSearch, nextPage);

      // Merge new results with existing results
      setResults(prevResults => {
        return prevResults.map(prevResult => {
          const newResult = aggregatedResults.results.find(r => r.platform === prevResult.platform);

          if (newResult && newResult.success) {
            // Filter out duplicates based on ID
            const existingIds = new Set(prevResult.results.map(p => p.id));
            const uniqueNewProducts = newResult.results.filter(p => !existingIds.has(p.id));

            return {
              ...prevResult,
              results: [...prevResult.results, ...uniqueNewProducts],
              page: newResult.page,
              hasMore: newResult.hasMore,
              totalCount: newResult.totalCount
            };
          }

          return prevResult;
        });
      });

      setPage(nextPage);
    } catch (error) {
      console.error('Load more failed:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Flatten successful results
  const rawProducts = results
    .filter((r) => r.success && selectedPlatforms.has(r.platform))
    .flatMap((r) => r.results);

  // Apply advanced filters
  const allProducts = applyFilters(rawProducts, activeFilters);

  // Get failed platforms for error display
  const failedPlatforms = results.filter((r) => !r.success);
  const successfulPlatforms = results.filter((r) => r.success);

  // Check if any selected platform has more results
  const hasMoreResults = results
    .filter(r => r.success && selectedPlatforms.has(r.platform))
    .some(r => r.hasMore);

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Multi-Platform Supplier Search
        </h1>
        <p className="text-muted-foreground mb-6">
          Search across Alibaba and Made-in-China platforms simultaneously
        </p>
        <SearchBar onSearch={handleSearch} loading={loading} />
      </div>

      {/* Platform Filter */}
      <PlatformFilter
        selectedPlatforms={selectedPlatforms}
        onChange={setSelectedPlatforms}
      />

      {/* Advanced Filters */}
      <AdvancedFilters
        activePlatforms={selectedPlatforms}
        activeFilters={activeFilters}
        onFilterChange={setActiveFilters}
      />

      {/* Search Status Messages */}
      {query && !loading && (
        <div className="mb-6 space-y-3">
          {/* Success Message */}
          {successfulPlatforms.length > 0 && selectedPlatforms.size > 0 && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Search Completed</AlertTitle>
              <AlertDescription>
                Found {allProducts.length} products across {successfulPlatforms.filter(p => selectedPlatforms.has(p.platform)).length} active platform
                {successfulPlatforms.filter(p => selectedPlatforms.has(p.platform)).length !== 1 ? 's' : ''} for "{query}"
                {activeFilters.length > 0 && ` (Filtered from ${rawProducts.length})`}
              </AlertDescription>
            </Alert>
          )}

          {/* Partial Failure Warning */}
          {failedPlatforms.length > 0 && successfulPlatforms.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Partial Results</AlertTitle>
              <AlertDescription>
                {failedPlatforms.map((r) => r.platform).join(', ')} failed to load.
                Showing results from working platforms only.
              </AlertDescription>
            </Alert>
          )}

          {/* Complete Failure Error */}
          {failedPlatforms.length > 0 && successfulPlatforms.length === 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Search Failed</AlertTitle>
              <AlertDescription>
                All platforms failed to respond. Please check your connection and try again.
                {failedPlatforms[0]?.error && ` Error: ${failedPlatforms[0].error}`}
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Results Grid */}
      <ProductGrid
        products={allProducts}
        onProductClick={(product: UnifiedSupplier) => {
          setSelectedProduct(product);
          setDetailSheetOpen(true);
        }}
        loading={loading}
        emptyMessage={
          selectedPlatforms.size === 0
            ? "No platforms selected. Please select at least one platform to view results."
            : query
              ? `No products found for "${query}". Try a different search term or clear filters.`
              : 'Enter a search query to find products across multiple platforms.'
        }
      />

      {/* Load More Button */}
      {hasMoreResults && !loading && allProducts.length > 0 && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="px-6 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isLoadingMore ? 'Loading more...' : 'Load More Results'}
          </button>
        </div>
      )}

      {/* Product Detail Sheet */}
      <ProductDetailSheet
        product={selectedProduct}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
      />
    </div>
  );
}
