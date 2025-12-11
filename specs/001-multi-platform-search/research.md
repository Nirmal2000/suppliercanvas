# Research: Multi-Platform Product Search

**Feature**: 001-multi-platform-search
**Date**: 2025-12-10
**Status**: Complete

## Overview

This document captures research findings for building a multi-platform B2B product search application. The primary unknowns from the Technical Context that needed resolution were testing framework selection and implementation patterns for the platform adapter architecture.

---

## Research Topics

### 1. Testing Framework Selection

**Question**: Which testing framework should be used for this Next.js 15 + React 19 project?

**Decision**: Vitest + React Testing Library for unit/integration tests, Playwright for E2E tests

**Rationale**:
- **Vitest** is faster than Jest (native ESM support, better TypeScript integration)
- Compatible with React 19 and Next.js 15 App Router
- **React Testing Library** is the industry standard for component testing
- **Playwright** provides better cross-browser E2E testing than Cypress
- Vitest has built-in coverage reporting and watch mode
- Smaller dependency footprint compared to Jest

**Alternatives Considered**:
- **Jest + React Testing Library**: More mature but slower, requires more configuration for ESM
- **Cypress**: Good E2E tool but Playwright has better multi-browser support and debugging
- **Native Node test runner**: Too basic for a React application

**Implementation Notes**:
- Add dependencies: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@playwright/test`
- Configure `vitest.config.ts` for TypeScript path aliases
- Set up Playwright for E2E tests with chromium/firefox/webkit

---

### 2. Platform Adapter Architecture Pattern

**Question**: How should platform integrations be structured to support easy addition of new platforms?

**Decision**: Adapter Pattern with Registry and Strategy Pattern for filtering

**Rationale**:
- Each platform adapter implements a common `PlatformAdapter` interface
- Platform-specific logic (API calls, data mapping, filtering) is encapsulated
- Registry pattern allows runtime discovery of available platforms
- New platforms can be added by implementing the interface and registering
- Follows Open/Closed Principle: open for extension, closed for modification

**Alternatives Considered**:
- **Direct API calls in components**: Violates separation of concerns, not scalable
- **Factory Pattern only**: Harder to discover available platforms at runtime
- **Plugin architecture**: Overly complex for this scope

**Core Interfaces**:

```typescript
// lib/platforms/types.ts
export interface UnifiedSupplier {
  id: string;
  platform: PlatformType;
  name: string;
  price: string | null;
  currency: string | null;
  moq: string | null;
  images: string[];
  supplier: {
    id: string;
    name: string;
    location?: string;
    verification?: string[];
  };
  url: string;
  platformSpecific: Record<string, any>;
}

export interface PlatformAdapter {
  platform: PlatformType;
  search(query: string, page: number): Promise<UnifiedSupplier[]>;
  mapToUnified(rawData: unknown): UnifiedSupplier[];
  getSupportedFilters(): FilterDefinition[];
  applyFilter(products: UnifiedSupplier[], filter: FilterCriteria): UnifiedSupplier[];
}

export interface PlatformRegistry {
  register(adapter: PlatformAdapter): void;
  get(platform: PlatformType): PlatformAdapter | undefined;
  getAll(): PlatformAdapter[];
  getAllPlatforms(): PlatformType[];
}
```

**Implementation Pattern**:

```typescript
// lib/platforms/registry.ts
class PlatformRegistryImpl implements PlatformRegistry {
  private adapters = new Map<PlatformType, PlatformAdapter>();

  register(adapter: PlatformAdapter) {
    this.adapters.set(adapter.platform, adapter);
  }

  // ... other methods
}

export const platformRegistry = new PlatformRegistryImpl();

// Auto-register on import
import { alibabaAdapter } from './alibaba/adapter';
import { madeInChinaAdapter } from './madeinchina/adapter';

platformRegistry.register(alibabaAdapter);
platformRegistry.register(madeInChinaAdapter);
```

---

### 3. Data Normalization Strategy

**Question**: How should we handle different data structures from Alibaba vs Made-in-China APIs?

**Decision**: Mapper pattern with best-effort field extraction and platform metadata

**Rationale**:
- Alibaba API returns rich JSON with structured data
- Made-in-China requires HTML parsing and field extraction
- Both should map to the same `UnifiedSupplier` schema
- Missing fields should be `null` rather than omitted
- Platform-specific data stored in `platformSpecific` object for detail view

**Mapping Approach**:

**Alibaba Mapping** (docs/alibaba.md):
```typescript
// lib/platforms/alibaba/mapper.ts
export function mapAlibabaToUnified(offer: AlibabaOffer): UnifiedSupplier {
  return {
    id: `alibaba-${offer.companyId}-${offer.productList?.[0]?.productId || Date.now()}`,
    platform: 'alibaba',
    name: offer.companyName,
    price: offer.productList?.[0]?.price || null,
    currency: 'USD', // Alibaba default
    moq: offer.productList?.[0]?.moq || null,
    images: [
      offer.companyIcon,
      ...offer.companyImage,
      ...offer.productList.map(p => p.productImg)
    ].filter(Boolean),
    supplier: {
      id: offer.companyId,
      name: offer.companyName,
      location: `${offer.city}, ${offer.countryCode}`,
      verification: [
        offer.verifiedSupplier ? 'Verified Supplier' : null,
        offer.verifiedSupplierPro ? 'Pro Supplier' : null,
        offer.isFactory ? 'Factory' : null,
        offer.goldYears ? `Gold ${offer.goldYears}` : null
      ].filter(Boolean)
    },
    url: `https:${offer.action}`,
    platformSpecific: {
      reviewScore: offer.reviewScore,
      reviewCount: offer.reviewCount,
      onTimeDelivery: offer.onTimeDelivery,
      replyAvgTime: offer.replyAvgTime,
      mainProducts: offer.mainProducts,
      products: offer.productList
    }
  };
}
```

**Made-in-China Mapping** (docs/mic.md):
```typescript
// lib/platforms/madeinchina/mapper.ts
export function mapMICToUnified(company: MICCompany): UnifiedSupplier {
  return {
    id: `mic-${company.companyId}`,
    platform: 'madeinchina',
    name: company.companyName,
    price: null, // Not in listing view
    currency: null,
    moq: null,
    images: [
      ...company.productImages,
      company.companyLogoUrl // Usually null in listings
    ].filter(Boolean),
    supplier: {
      id: company.companyId,
      name: company.companyName,
      location: `${company.city}, ${company.province}`,
      verification: [
        company.isAuditedSupplier ? 'Audited' : null,
        company.capabilityStars ? `${company.capabilityStars} Stars` : null,
        company.certifications
      ].filter(Boolean)
    },
    url: company.companyUrl,
    platformSpecific: {
      mainProducts: company.mainProducts,
      productList: company.productList,
      certifications: company.certifications,
      inquiryUrl: company.inquiryUrl,
      chatId: company.chatId
    }
  };
}
```

**Key Decisions**:
- Use platform prefix in IDs to avoid collisions
- Store arrays of images (flatten all available image sources)
- Verification badges stored as string array for display flexibility
- `platformSpecific` contains original data for detail sheet

---

### 4. API Proxy Implementation

**Question**: Should API calls be made client-side or server-side? How to handle CORS?

**Decision**: Use Next.js API routes as server-side proxy

**Rationale**:
- Alibaba API may have CORS restrictions
- Made-in-China requires HTML parsing (better done server-side)
- Protects against exposing API keys or rate limit abuse
- Enables server-side caching if needed in future
- Better error handling and logging

**Implementation Pattern**:

```typescript
// app/api/search/alibaba/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { alibabaAdapter } from '@/lib/platforms/alibaba/adapter';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  const page = parseInt(searchParams.get('page') || '1');

  if (!query) {
    return NextResponse.json({ error: 'Query required' }, { status: 400 });
  }

  try {
    const results = await alibabaAdapter.search(query, page);
    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Alibaba search error:', error);
    return NextResponse.json(
      { success: false, error: 'Search failed' },
      { status: 500 }
    );
  }
}
```

**Client-Side Usage**:
```typescript
// lib/search/search-service.ts
export async function searchAlibaba(query: string, page: number) {
  const response = await fetch(`/api/search/alibaba?query=${encodeURIComponent(query)}&page=${page}`);
  if (!response.ok) throw new Error('Alibaba search failed');
  return response.json();
}
```

---

### 5. State Management Approach

**Question**: What state management solution should be used for search results and filters?

**Decision**: React Server Components + URL state + React Context for client-side state

**Rationale**:
- Next.js 15 App Router encourages Server Components
- URL parameters for search query and page (shareable, bookmarkable)
- React Context for filter state (ephemeral, doesn't need URL persistence)
- No need for Redux/Zustand - application state is simple
- Keeps bundle size small

**State Structure**:

```typescript
// URL State (searchParams)
?query=vacuum+cleaner&page=1

// Client Context State
interface SearchState {
  results: UnifiedSupplier[];
  loading: boolean;
  error: string | null;
  selectedPlatforms: Set<PlatformType>;
  filters: Record<string, FilterValue>;
}
```

**Alternatives Considered**:
- **Redux Toolkit**: Overkill for this simple state
- **Zustand**: Lightweight but unnecessary given simple requirements
- **Local component state only**: Makes state management harder across filter components

---

### 6. Error Handling Strategy

**Question**: How should API failures be handled when one platform fails but others succeed?

**Decision**: Partial success pattern with error indicators

**Rationale**:
- Users should see results from working platforms
- Failed platforms should show error message but not block UI
- Use `Promise.allSettled()` to allow partial failures
- Display per-platform error states in UI

**Implementation**:

```typescript
// lib/search/search-service.ts
export async function searchAllPlatforms(query: string, platforms: PlatformType[]) {
  const searchPromises = platforms.map(async (platform) => {
    try {
      const response = await fetch(`/api/search/${platform}?query=${query}`);
      if (!response.ok) throw new Error(`${platform} failed`);
      const data = await response.json();
      return { platform, success: true, results: data.results };
    } catch (error) {
      return { platform, success: false, error: error.message, results: [] };
    }
  });

  const results = await Promise.allSettled(searchPromises);

  return results.map(result =>
    result.status === 'fulfilled' ? result.value : result.reason
  );
}
```

---

## Summary of Decisions

| Topic | Decision | Impact |
|-------|----------|--------|
| Testing | Vitest + Playwright | Need to add test dependencies and configuration |
| Architecture | Adapter Pattern + Registry | Clear extension point for new platforms |
| Data Mapping | Mapper functions per platform | Each platform has mapper.ts file |
| API Layer | Next.js API routes as proxy | Create route.ts files in app/api/search/ |
| State Management | URL params + React Context | Simple, no external state library needed |
| Error Handling | Partial success pattern | Graceful degradation when platforms fail |

---

## Next Steps (Phase 1)

1. Create `data-model.md` with detailed UnifiedSupplier schema
2. Define OpenAPI contracts for API routes in `contracts/`
3. Write implementation quickstart in `quickstart.md`
4. Update agent context with chosen technologies

---

**Research Complete**: All NEEDS CLARIFICATION items from Technical Context have been resolved.
