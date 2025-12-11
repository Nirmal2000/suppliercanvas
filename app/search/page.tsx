'use client';

import { useState, useEffect } from 'react';
import { MultiInputSearchBar } from '@/components/search/multi-input-search-bar';
import { ProductGrid } from '@/components/search/product-grid';
import { ProductDetailSheet } from '@/components/search/product-detail-sheet';
import { PlatformFilter } from '@/components/search/platform-filter';
import { AdvancedFilters } from '@/components/search/advanced-filters';
import { InputFilter } from '@/components/search/input-filter';
import { UnifiedSupplier, PlatformType, SearchInput, FilterValue } from '@/lib/platforms/types';
import { searchUnified } from '@/lib/search/search-service';
import { applyFilters } from '@/lib/search/filter-service';
import { CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ChatSidebar } from "@/components/agent/chat-sidebar";
import { useSearchStore } from "@/lib/agent/state";

export default function SearchPage() {
  const [inputs, setInputs] = useState<SearchInput[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<UnifiedSupplier[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<PlatformType>>(
    new Set(['alibaba', 'madeinchina'])
  );

  // Agent Store Sync
  const { searchResults: agentResults, setSearchResults: setAgentResults } = useSearchStore();

  const [activeFilters, setActiveFilters] = useState<FilterValue[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<UnifiedSupplier | null>(null);
  const [selectedInputId, setSelectedInputId] = useState<string | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);

  // Sync Agent Results to Local State
  useEffect(() => {
    console.log("Page Sync Effect - Agent Results:", agentResults?.length, "Loading:", loading);
    // If agent has results and we aren't currently loading a manual search
    if (agentResults.length > 0 && !loading) {
      console.log("Updating Page Results from Agent");
      setResults(agentResults);
    }
  }, [agentResults, loading]);

  const handleSearch = async (searchInputs: SearchInput[]) => {
    setInputs(searchInputs);
    setLoading(true);
    setActiveFilters([]);
    setSelectedInputId(null);

    try {
      const platforms: PlatformType[] = Array.from(selectedPlatforms);
      const aggregatedResults = await searchUnified(searchInputs, platforms);
      setResults(aggregatedResults.results);
      setAgentResults(aggregatedResults.results); // Sync to Agent Store
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter Logic:
  // 1. Platform Filter
  // 2. Input Source Filter
  // 3. Advanced Filters

  const platformFiltered = results.filter(r => selectedPlatforms.has(r.platform));

  const inputFiltered = selectedInputId
    ? platformFiltered.filter(r => r.matchedInputIds?.includes(selectedInputId))
    : platformFiltered;

  const finalDisplayProducts = applyFilters(inputFiltered, activeFilters);

  return (
    <div className="flex min-h-screen w-full">
      {/* Main Search Content */}
      <div className="flex-1 container mx-auto px-4 py-8 max-w-7xl overflow-y-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Multi-Platform Supplier Search
          </h1>
          <p className="text-muted-foreground mb-6">
            Search across Alibaba and Made-in-China using text and images simultaneously.
          </p>
          <MultiInputSearchBar onSearch={handleSearch} loading={loading} />
        </div>

        {/* Filters Section */}
        <div className="space-y-4 mb-6">
          <PlatformFilter
            selectedPlatforms={selectedPlatforms}
            onChange={setSelectedPlatforms}
          />

          <AdvancedFilters
            activePlatforms={selectedPlatforms}
            activeFilters={activeFilters}
            onFilterChange={setActiveFilters}
          />

          {/* Input Source Filter */}
          {inputs.length > 1 && !loading && (
            <InputFilter
              inputs={inputs}
              selectedInputId={selectedInputId}
              onSelect={setSelectedInputId}
            />
          )}
        </div>

        {/* Search Status Messages */}
        {inputs.length > 0 && !loading && (
          <div className="mb-6 space-y-3">
            {finalDisplayProducts.length > 0 && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Search Completed</AlertTitle>
                <AlertDescription>
                  Found {finalDisplayProducts.length} suppliers matching your criteria.
                  {(activeFilters.length > 0 || selectedInputId) && ` (Filtered from ${platformFiltered.length})`}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Results Grid */}
        <ProductGrid
          products={finalDisplayProducts}
          onProductClick={(product: UnifiedSupplier) => {
            setSelectedProduct(product);
            setDetailSheetOpen(true);
          }}
          loading={loading}
          emptyMessage={
            selectedPlatforms.size === 0
              ? "No platforms selected. Please select at least one platform to view results."
              : inputs.length > 0
                ? `No suppliers found for your inputs. Try different keywords or images.`
                : 'Add text or image inputs, or ask the Agent on the right to start searching.'
          }
          inputs={inputs}
        />
      </div>

      {/* Right Sidebar - Agent Chat */}
      <div className="w-[400px] border-l bg-muted/10 sticky top-0 h-screen overflow-hidden">
        <ChatSidebar />
      </div>

      {/* Product Detail Sheet */}
      <ProductDetailSheet
        product={selectedProduct}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
      />
    </div>
  );
}
