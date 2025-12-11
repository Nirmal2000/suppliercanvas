# Implementation Quickstart: Multi-Platform Product Search

**Feature**: 001-multi-platform-search
**Branch**: `001-multi-platform-search`
**Date**: 2025-12-10

## Overview

This quickstart guide provides a recommended implementation order for the multi-platform search feature. Follow these steps sequentially to build the feature incrementally with working code at each stage.

---

## Prerequisites

Ensure your development environment has:
- Node.js 20+ installed
- Git repository initialized
- Next.js 15.3.1 project set up (already done)
- shadcn/ui components installed (already done)

---

## Implementation Phases

### Phase 1: Foundation (Core Types & Utilities)

**Goal**: Establish TypeScript types and utility functions.

**Files to Create**:
1. `lib/platforms/types.ts` - Core interfaces
2. `lib/utils.ts` - Helper functions (may already exist)

**Implementation**:

```typescript
// lib/platforms/types.ts
export type PlatformType = 'alibaba' | 'madeinchina';

export interface UnifiedSupplier {
  id: string;
  platform: PlatformType;
  name: string;
  description?: string;
  price: string | null;
  currency: string | null;
  moq: string | null;
  images: string[];
  supplier: {
    id: string;
    name: string;
    location?: string;
    verification: string[];
  };
  url: string;
  platformSpecific: Record<string, any>;
}

export interface SearchResult {
  platform: PlatformType;
  success: boolean;
  results: UnifiedSupplier[];
  error?: string;
  totalCount?: number;
  page: number;
  hasMore: boolean;
}

export interface AggregatedSearchResult {
  query: string;
  results: SearchResult[];
  timestamp: number;
}

export interface PlatformAdapter {
  platform: PlatformType;
  search(query: string, page: number): Promise<UnifiedSupplier[]>;
  mapToUnified(rawData: unknown): UnifiedSupplier[];
}
```

**Test**: TypeScript compilation should pass (`npm run build` or `tsc --noEmit`)

---

### Phase 2: Platform Adapters (Data Mapping)

**Goal**: Implement Alibaba and Made-in-China adapters with data mappers.

**Files to Create**:
1. `lib/platforms/alibaba/types.ts` - Alibaba-specific types
2. `lib/platforms/alibaba/mapper.ts` - Alibaba → UnifiedSupplier mapper
3. `lib/platforms/madeinchina/types.ts` - MIC-specific types
4. `lib/platforms/madeinchina/mapper.ts` - MIC → UnifiedSupplier mapper

**Implementation Pattern** (Alibaba example):

```typescript
// lib/platforms/alibaba/types.ts
export interface AlibabaSearchResponse {
  success: boolean;
  model: {
    offers: AlibabaOffer[];
    totalCount: number;
  };
}

export interface AlibabaOffer {
  companyId: string;
  companyName: string;
  action: string;
  city: string;
  countryCode: string;
  companyIcon: string;
  companyImage: string[];
  verifiedSupplier: boolean;
  goldYears: string;
  reviewScore: string;
  reviewCount: number;
  productList: Array<{
    productId: string;
    productImg: string;
    price: string;
    moq: string;
    action: string;
  }>;
  // ... other fields from docs/alibaba.md
}

// lib/platforms/alibaba/mapper.ts
import { UnifiedSupplier } from '../types';
import { AlibabaOffer } from './types';

export function mapAlibabaToUnified(offer: AlibabaOffer): UnifiedSupplier {
  const firstProduct = offer.productList?.[0];

  return {
    id: `alibaba-${offer.companyId}-${firstProduct?.productId || Date.now()}`,
    platform: 'alibaba',
    name: offer.companyName,
    price: firstProduct?.price || null,
    currency: extractCurrency(firstProduct?.price),
    moq: firstProduct?.moq || null,
    images: [
      offer.companyIcon,
      ...offer.companyImage,
      ...offer.productList.map(p => p.productImg)
    ].filter(Boolean),
    supplier: {
      id: offer.companyId,
      name: offer.companyName,
      location: `${offer.city}, ${offer.countryCode}`,
      verification: buildVerificationBadges(offer)
    },
    url: `https:${offer.action}`,
    platformSpecific: {
      reviewScore: offer.reviewScore,
      reviewCount: offer.reviewCount,
      products: offer.productList,
      // ... preserve other Alibaba-specific fields
    }
  };
}

function extractCurrency(price: string | undefined): string | null {
  if (!price) return null;
  // Extract currency symbol or code (₹ = INR, $ = USD, etc.)
  const match = price.match(/[₹$€£¥]/);
  if (match) {
    const symbolMap: Record<string, string> = {
      '₹': 'INR', '$': 'USD', '€': 'EUR', '£': 'GBP', '¥': 'CNY'
    };
    return symbolMap[match[0]] || null;
  }
  return null;
}

function buildVerificationBadges(offer: AlibabaOffer): string[] {
  const badges: string[] = [];
  if (offer.verifiedSupplier) badges.push('Verified Supplier');
  if (offer.goldYears) badges.push(`Gold ${offer.goldYears}`);
  // ... add other badges
  return badges;
}
```

**Test**: Write unit tests for mappers

```typescript
// __tests__/unit/platforms/alibaba-mapper.test.ts
import { describe, it, expect } from 'vitest';
import { mapAlibabaToUnified } from '@/lib/platforms/alibaba/mapper';
import { AlibabaOffer } from '@/lib/platforms/alibaba/types';

describe('Alibaba Mapper', () => {
  it('should map complete Alibaba offer to UnifiedSupplier', () => {
    const offer: AlibabaOffer = {
      companyId: '12345',
      companyName: 'Test Company',
      action: '//test.alibaba.com',
      city: 'Shenzhen',
      countryCode: 'CN',
      companyIcon: 'https://example.com/icon.png',
      companyImage: [],
      verifiedSupplier: true,
      goldYears: '2 yrs',
      reviewScore: '4.5',
      reviewCount: 10,
      productList: [{
        productId: '001',
        productImg: 'https://example.com/product.jpg',
        price: '$100-200',
        moq: 'Min. order: 5 pieces',
        action: '//test.alibaba.com/product'
      }]
    };

    const result = mapAlibabaToUnified(offer);

    expect(result.id).toBe('alibaba-12345-001');
    expect(result.platform).toBe('alibaba');
    expect(result.name).toBe('Test Company');
    expect(result.price).toBe('$100-200');
    expect(result.currency).toBe('USD');
    expect(result.supplier.verification).toContain('Verified Supplier');
  });

  it('should handle missing fields gracefully', () => {
    const minimalOffer: AlibabaOffer = {
      companyId: '12345',
      companyName: 'Test Company',
      action: '//test.alibaba.com',
      city: 'Shenzhen',
      countryCode: 'CN',
      companyIcon: '',
      companyImage: [],
      verifiedSupplier: false,
      goldYears: '',
      reviewScore: '',
      reviewCount: 0,
      productList: []
    };

    const result = mapAlibabaToUnified(minimalOffer);

    expect(result.price).toBeNull();
    expect(result.moq).toBeNull();
    expect(result.images).toEqual([]);
  });
});
```

**Run Tests**: `npm test` or `vitest`

---

### Phase 3: API Routes (Backend Proxy)

**Goal**: Create Next.js API routes to proxy platform API calls.

**Files to Create**:
1. `app/api/search/alibaba/route.ts`
2. `app/api/search/madeinchina/route.ts`
3. `app/api/search/all/route.ts` (optional for Phase 3, can defer)

**Implementation** (Alibaba route):

```typescript
// app/api/search/alibaba/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { mapAlibabaToUnified } from '@/lib/platforms/alibaba/mapper';
import { AlibabaSearchResponse } from '@/lib/platforms/alibaba/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');

  if (!query) {
    return NextResponse.json(
      { success: false, error: 'Query parameter is required' },
      { status: 400 }
    );
  }

  try {
    // Build Alibaba API URL (from docs/alibaba.md)
    const alibabaUrl = new URL('https://www.alibaba.com/search/api/supplierTextSearch');
    alibabaUrl.searchParams.set('query', query);
    alibabaUrl.searchParams.set('page', page.toString());
    alibabaUrl.searchParams.set('pageSize', pageSize.toString());
    // Add other required params from docs/alibaba.md
    alibabaUrl.searchParams.set('from', 'pcHomeContent');
    alibabaUrl.searchParams.set('langident', 'en');

    const response = await fetch(alibabaUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Alibaba API returned ${response.status}`);
    }

    const data: AlibabaSearchResponse = await response.json();

    if (!data.success) {
      throw new Error('Alibaba API returned success: false');
    }

    const results = data.model.offers.map(mapAlibabaToUnified);

    return NextResponse.json({
      success: true,
      platform: 'alibaba',
      results,
      totalCount: data.model.totalCount,
      page,
      hasMore: results.length === pageSize
    });
  } catch (error) {
    console.error('Alibaba search error:', error);
    return NextResponse.json(
      {
        success: false,
        platform: 'alibaba',
        error: error instanceof Error ? error.message : 'Search failed',
        results: [],
        page,
        hasMore: false
      },
      { status: 500 }
    );
  }
}
```

**Made-in-China Route** (requires HTML parsing):

```typescript
// app/api/search/madeinchina/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { mapMICToUnified } from '@/lib/platforms/madeinchina/mapper';
import { parseMICHTML } from '@/lib/platforms/madeinchina/parser';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  const page = parseInt(searchParams.get('page') || '1');

  if (!query) {
    return NextResponse.json(
      { success: false, error: 'Query parameter is required' },
      { status: 400 }
    );
  }

  try {
    // Build Made-in-China URL (from docs/mic.md)
    const keyword = query.replace(/ /g, '+');
    const micUrl = `https://www.made-in-china.com/company-search/${keyword}/C1/${page}.html`;

    const response = await fetch(micUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html'
      }
    });

    if (!response.ok) {
      throw new Error(`Made-in-China returned ${response.status}`);
    }

    const html = await response.text();
    const companies = parseMICHTML(html); // Parse HTML (use cheerio or similar)
    const results = companies.map(mapMICToUnified);

    return NextResponse.json({
      success: true,
      platform: 'madeinchina',
      results,
      page,
      hasMore: results.length > 0 // Estimate, MIC doesn't provide total
    });
  } catch (error) {
    console.error('Made-in-China search error:', error);
    return NextResponse.json(
      {
        success: false,
        platform: 'madeinchina',
        error: error instanceof Error ? error.message : 'Search failed',
        results: [],
        page,
        hasMore: false
      },
      { status: 500 }
    );
  }
}

// lib/platforms/madeinchina/parser.ts
// You'll need to install: npm install cheerio
import * as cheerio from 'cheerio';
import { MICCompany } from './types';

export function parseMICHTML(html: string): MICCompany[] {
  const $ = cheerio.load(html);
  const companies: MICCompany[] = [];

  $('.list-node').each((_, element) => {
    const $el = $(element);

    // Extract fields per docs/mic.md
    const companyName = $el.find('h2.company-name a').text().trim();
    const companyUrl = $el.find('h2.company-name a').attr('href') || '';
    const companyId = extractCompanyId($el.find('h2.company-name a').attr('ads-data') || '');

    // ... extract other fields per docs/mic.md parsing instructions

    companies.push({
      companyName,
      companyUrl: companyUrl.startsWith('//') ? `https:${companyUrl}` : companyUrl,
      companyId,
      // ... other fields
    });
  });

  return companies;
}

function extractCompanyId(adsData: string): string {
  const match = adsData.match(/pcid:([^,]+)/);
  return match ? match[1] : '';
}
```

**Test**: Integration tests for API routes

```typescript
// __tests__/integration/api/alibaba-proxy.test.ts
import { describe, it, expect } from 'vitest';

describe('GET /api/search/alibaba', () => {
  it('should return 400 if query is missing', async () => {
    const response = await fetch('http://localhost:3000/api/search/alibaba');
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.success).toBe(false);
  });

  // Add more integration tests (requires test server running)
});
```

---

### Phase 4: UI Components (Search Interface)

**Goal**: Build search bar, product grid, and filter components.

**Files to Create**:
1. `components/search/search-bar.tsx`
2. `components/search/product-grid.tsx`
3. `components/search/product-card.tsx`
4. `components/search/platform-filter.tsx`

**Implementation** (Search Bar):

```typescript
// components/search/search-bar.tsx
'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  loading?: boolean;
}

export function SearchBar({ onSearch, loading = false }: SearchBarProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-2xl">
      <Input
        type="text"
        placeholder="Search for products (e.g., vacuum cleaner, sofa)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={loading}
        className="flex-1"
      />
      <Button type="submit" disabled={loading || !query.trim()}>
        <Search className="mr-2 h-4 w-4" />
        Search
      </Button>
    </form>
  );
}
```

**Product Grid**:

```typescript
// components/search/product-grid.tsx
'use client';

import { UnifiedSupplier } from '@/lib/platforms/types';
import { ProductCard } from './product-card';

interface ProductGridProps {
  products: UnifiedSupplier[];
  onProductClick: (product: UnifiedSupplier) => void;
}

export function ProductGrid({ products, onProductClick }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No products found. Try a different search query.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onClick={() => onProductClick(product)}
        />
      ))}
    </div>
  );
}
```

**Product Card**:

```typescript
// components/search/product-card.tsx
'use client';

import { UnifiedSupplier } from '@/lib/platforms/types';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';

interface ProductCardProps {
  product: UnifiedSupplier;
  onClick: () => void;
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  const primaryImage = product.images[0] || '/placeholder-product.png';

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      <CardHeader className="p-0">
        <div className="relative aspect-square">
          <Image
            src={primaryImage}
            alt={product.name}
            fill
            className="object-cover rounded-t-lg"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          />
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="secondary">{product.platform}</Badge>
        </div>
        <h3 className="font-semibold text-sm line-clamp-2 mb-2">
          {product.name}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-1">
          {product.supplier.name}
        </p>
        {product.price && (
          <p className="text-sm font-bold mt-2">
            {product.price} {product.currency}
          </p>
        )}
      </CardContent>
      <CardFooter className="p-4 pt-0 text-xs text-muted-foreground">
        {product.supplier.location || 'Location unknown'}
      </CardFooter>
    </Card>
  );
}
```

---

### Phase 5: Main Search Page

**Goal**: Create the main search page that orchestrates everything.

**Files to Create**:
1. `app/search/page.tsx`
2. `components/search/product-detail-sheet.tsx`

**Implementation**:

```typescript
// app/search/page.tsx
'use client';

import { useState } from 'react';
import { SearchBar } from '@/components/search/search-bar';
import { ProductGrid } from '@/components/search/product-grid';
import { PlatformFilter } from '@/components/search/platform-filter';
import { ProductDetailSheet } from '@/components/search/product-detail-sheet';
import { UnifiedSupplier, PlatformType, SearchResult } from '@/lib/platforms/types';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<PlatformType>>(
    new Set(['alibaba', 'madeinchina'])
  );
  const [selectedProduct, setSelectedProduct] = useState<UnifiedSupplier | null>(null);

  const handleSearch = async (searchQuery: string) => {
    setQuery(searchQuery);
    setLoading(true);

    try {
      // Search all platforms in parallel
      const platforms: PlatformType[] = Array.from(selectedPlatforms);
      const searchPromises = platforms.map(async (platform) => {
        const response = await fetch(
          `/api/search/${platform}?query=${encodeURIComponent(searchQuery)}`
        );
        return response.json();
      });

      const platformResults = await Promise.all(searchPromises);
      setResults(platformResults);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Flatten and filter results
  const allProducts = results
    .filter((r) => r.success && selectedPlatforms.has(r.platform))
    .flatMap((r) => r.results);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Multi-Platform Supplier Search</h1>
        <SearchBar onSearch={handleSearch} loading={loading} />
      </div>

      <div className="mb-6">
        <PlatformFilter
          selectedPlatforms={selectedPlatforms}
          onToggle={(platform) => {
            const updated = new Set(selectedPlatforms);
            if (updated.has(platform)) {
              updated.delete(platform);
            } else {
              updated.add(platform);
            }
            setSelectedPlatforms(updated);
          }}
        />
      </div>

      {loading && <div className="text-center py-12">Searching...</div>}

      {!loading && query && (
        <ProductGrid
          products={allProducts}
          onProductClick={setSelectedProduct}
        />
      )}

      <ProductDetailSheet
        product={selectedProduct}
        open={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </div>
  );
}
```

---

### Phase 6: Testing & Refinement

**Goal**: Add comprehensive tests and polish the UI.

**Tasks**:
1. Write E2E tests with Playwright
2. Add loading skeletons
3. Add error states
4. Add empty states
5. Test with real API data
6. Handle edge cases (no images, missing fields, etc.)

**E2E Test Example**:

```typescript
// __tests__/e2e/search-flow.spec.ts
import { test, expect } from '@playwright/test';

test('complete search flow', async ({ page }) => {
  await page.goto('http://localhost:3000/search');

  // Enter search query
  await page.fill('input[placeholder*="Search"]', 'vacuum cleaner');
  await page.click('button:has-text("Search")');

  // Wait for results
  await page.waitForSelector('[data-testid="product-card"]', { timeout: 5000 });

  // Check that results appeared
  const productCards = await page.locator('[data-testid="product-card"]').count();
  expect(productCards).toBeGreaterThan(0);

  // Click on first product
  await page.locator('[data-testid="product-card"]').first().click();

  // Check detail sheet opened
  await expect(page.locator('[data-testid="product-detail-sheet"]')).toBeVisible();
});
```

---

## Testing Commands

```bash
# Install test dependencies
npm install -D vitest @testing-library/react @testing-library/jest-dom @vitejs/plugin-react
npm install -D @playwright/test
npm install cheerio  # For Made-in-China HTML parsing

# Run unit tests
npm run test

# Run E2E tests
npx playwright test

# Run development server
npm run dev
```

---

## Deployment Checklist

Before deploying to production:

- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] E2E tests passing
- [ ] Error handling tested (API failures, network errors)
- [ ] Loading states implemented
- [ ] Empty states implemented
- [ ] Responsive design verified (mobile, tablet, desktop)
- [ ] Images have proper loading and error states
- [ ] No console errors or warnings
- [ ] Environment variables configured (if any)
- [ ] SEO metadata added (if needed)

---

## Next Steps After Quickstart

Once the basic implementation is complete:

1. Add more platforms (Global Sources, 1688, etc.)
2. Implement advanced filters (price range, MOQ, verification status)
3. Add sorting options
4. Add pagination UI
5. Add search history (localStorage, no backend)
6. Add product comparison feature
7. Optimize performance (lazy loading, virtualization for large result sets)
8. Add analytics (privacy-preserving, client-side only)

---

**Implementation Order Summary**:

1. ✅ Types & interfaces (`lib/platforms/types.ts`)
2. ✅ Mappers (`lib/platforms/{platform}/mapper.ts`)
3. ✅ API routes (`app/api/search/{platform}/route.ts`)
4. ✅ UI components (`components/search/*.tsx`)
5. ✅ Main page (`app/search/page.tsx`)
6. ✅ Tests (unit, integration, E2E)

Total estimated implementation time: 2-3 days for core functionality, 1-2 days for polish and testing.
