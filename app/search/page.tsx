'use client';

import { useState } from 'react';
import { SearchBar } from '@/components/search/search-bar';
import { ProductGrid } from '@/components/search/product-grid';
import { ProductDetailSheet } from '@/components/search/product-detail-sheet';
import { PlatformFilter } from '@/components/search/platform-filter';
import { AdvancedFilters } from '@/components/search/advanced-filters';
import { UnifiedProduct, PlatformType, SearchResult, FilterValue } from '@/lib/platforms/types';
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
  const [activeFilters, setActiveFilters] = useState<FilterValue[]>([]); // Added state
  const [selectedProduct, setSelectedProduct] = useState<UnifiedProduct | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);

  const handleSearch = async (searchQuery: string) => {
    setQuery(searchQuery);
    setLoading(true);
    setActiveFilters([]); // Reset filters on new search

    try {
      // Always search all platforms initially to have data ready for filtering
      // Optimization: In a real app, we might only search selected platforms
      // But for this MVP, we search all and filter client-side as per requirements
      const platforms: PlatformType[] = ['alibaba', 'madeinchina'];
      const aggregatedResults = await searchAllPlatforms(searchQuery, platforms);
      setResults(aggregatedResults.results);
    } catch (error) {
      console.error('Search failed:', error);
      // Set empty results on complete failure
      setResults([]);
    } finally {
      setLoading(false);
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
        onProductClick={(product: UnifiedProduct) => {
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

      {/* Product Detail Sheet */}
      <ProductDetailSheet
        product={selectedProduct}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
      />
    </div>
  );
}
