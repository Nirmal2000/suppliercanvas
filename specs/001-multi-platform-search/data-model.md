# Data Model: Multi-Platform Product Search

**Feature**: 001-multi-platform-search
**Date**: 2025-12-10
**Status**: Phase 1 - Design Complete

## Overview

This document defines the core data models for the multi-platform product search application. The primary challenge is normalizing heterogeneous data from different B2B platforms (Alibaba, Made-in-China) into a unified schema while preserving platform-specific attributes for detailed views.

---

## Core Entities

### 1. UnifiedSupplier

The central entity representing a supplier/product offering from any platform, normalized to a common schema.

**Purpose**: Provide consistent data structure for display in grid and detail views regardless of source platform.

**Schema**:

```typescript
interface UnifiedSupplier {
  // Core Identifiers
  id: string;                    // Unique ID: "{platform}-{companyId}-{productId?}"
  platform: PlatformType;        // Source platform enum

  // Product Information
  name: string;                  // Product or company name
  description?: string;          // Product description (if available)
  price: string | null;          // Display price or price range (e.g., "₹7,704.35-25,589.44")
  currency: string | null;       // ISO currency code (e.g., "USD", "INR") or null
  moq: string | null;            // Minimum order quantity (e.g., "Min. order: 2 pieces")

  // Media
  images: string[];              // Array of image URLs (company logo, banners, product images)

  // Supplier Information
  supplier: {
    id: string;                  // Platform-specific supplier ID
    name: string;                // Supplier company name
    location?: string;           // City, Country or Province
    verification: string[];      // Array of verification badges
                                 // e.g., ["Verified Supplier", "Gold 2 yrs", "Factory"]
  };

  // Links
  url: string;                   // Link to company/product page on source platform

  // Platform-Specific Data
  platformSpecific: Record<string, any>;  // Preserves original platform data
                                          // for detail view and advanced features
}
```

**Validation Rules**:
- `id` MUST be unique across all platforms and products
- `platform` MUST be a valid PlatformType
- `name` and `supplier.name` MUST be non-empty strings
- `images` MAY be empty array but MUST be an array
- `verification` MAY be empty array but MUST be an array
- `url` MUST be a valid HTTP/HTTPS URL
- Nullable fields (`price`, `currency`, `moq`, `description`) MUST be explicitly `null` if unavailable (not undefined or empty string)

**Field Mappings by Platform**:

| Field | Alibaba Source | Made-in-China Source |
|-------|----------------|----------------------|
| id | `alibaba-{companyId}-{productId}` | `mic-{companyId}` |
| platform | `"alibaba"` | `"madeinchina"` |
| name | `companyName` or first `productList[0].name` | `companyName` |
| price | `productList[0].price` | `null` (not in listing) |
| currency | `"USD"` (default) | `null` |
| moq | `productList[0].moq` | `null` |
| images | `[companyIcon, ...companyImage, ...productList.productImg]` | `[...productImages, companyLogoUrl]` |
| supplier.id | `companyId` | `companyId` |
| supplier.name | `companyName` | `companyName` |
| supplier.location | `{city}, {countryCode}` | `{city}, {province}` |
| supplier.verification | `[verifiedSupplier, goldYears, isFactory]` | `[isAuditedSupplier, capabilityStars, certifications]` |
| url | `https:{action}` | `companyUrl` (add https:) |

---

### 2. PlatformType

Enumeration of supported platforms.

**Schema**:

```typescript
type PlatformType = 'alibaba' | 'madeinchina';

// Extensible for future platforms:
// type PlatformType = 'alibaba' | 'madeinchina' | 'globalsources' | '1688' | ...;
```

**Purpose**: Type-safe platform identification throughout the application.

---

### 3. SearchResult

Container for search results from a single platform, including metadata.

**Schema**:

```typescript
interface SearchResult {
  platform: PlatformType;
  success: boolean;
  results: UnifiedSupplier[];
  error?: string;              // Error message if success = false
  totalCount?: number;         // Total available results (for pagination)
  page: number;
  hasMore: boolean;            // Whether more pages are available
}
```

**Purpose**: Wrap platform search responses with status and pagination info.

---

### 4. AggregatedSearchResult

Combined results from all platforms.

**Schema**:

```typescript
interface AggregatedSearchResult {
  query: string;
  results: SearchResult[];     // One per platform
  timestamp: number;           // When search was executed
}
```

**Purpose**: Store complete multi-platform search response for client-side filtering.

---

## Filter Models

### 5. FilterDefinition

Defines available filters for a platform.

**Schema**:

```typescript
interface FilterDefinition {
  key: string;                 // Unique filter identifier (e.g., "moq", "priceRange")
  label: string;               // Display label (e.g., "Minimum Order Quantity")
  type: FilterType;
  platform?: PlatformType;     // If undefined, applies to all platforms
  options?: FilterOption[];    // For enum/multi-select filters
}

type FilterType = 'range' | 'boolean' | 'enum' | 'multiselect' | 'text';

interface FilterOption {
  value: string | number;
  label: string;
}
```

**Examples**:

```typescript
// Platform-agnostic filter
const platformFilter: FilterDefinition = {
  key: 'platform',
  label: 'Platform',
  type: 'multiselect',
  options: [
    { value: 'alibaba', label: 'Alibaba' },
    { value: 'madeinchina', label: 'Made in China' }
  ]
};

// Alibaba-specific filter
const verifiedSupplierFilter: FilterDefinition = {
  key: 'verifiedSupplier',
  label: 'Verified Suppliers Only',
  type: 'boolean',
  platform: 'alibaba'
};

// Price range filter (platform-agnostic but values differ)
const priceRangeFilter: FilterDefinition = {
  key: 'priceRange',
  label: 'Price Range',
  type: 'range'
};
```

---

### 6. FilterCriteria

User-selected filter values.

**Schema**:

```typescript
interface FilterCriteria {
  platforms: Set<PlatformType>;           // Selected platforms
  filters: Record<string, FilterValue>;   // Key-value pairs of active filters
}

type FilterValue =
  | string                    // text filter
  | number                    // numeric filter
  | boolean                   // boolean filter
  | [number, number]          // range filter [min, max]
  | string[];                 // multiselect filter
```

**Example**:

```typescript
const userFilters: FilterCriteria = {
  platforms: new Set(['alibaba', 'madeinchina']),
  filters: {
    priceRange: [1000, 5000],
    verifiedSupplier: true,
    moq: [1, 100]
  }
};
```

---

## Platform-Specific Data Models

### 7. Alibaba Platform Data

Stored in `platformSpecific` field of UnifiedSupplier.

**Schema** (matches docs/alibaba.md):

```typescript
interface AlibabaPlatformData {
  // Performance Metrics
  reviewScore?: string;        // "4.7"
  reviewCount?: number;        // 22
  onTimeDelivery?: string;     // "87%"
  replyAvgTime?: string;       // "≤2h"
  reorderRate?: string;        // "<15%"
  onlineRevenue?: string;      // "US $20,000+"

  // Product Information
  mainProducts?: Array<{
    name: string;
    count: number | null;
  }>;
  products?: Array<{
    productId: string;
    productImg: string;
    price: string;
    moq: string;
    action: string;            // Product detail URL
  }>;

  // Contact
  contactSupplier?: string;    // Message URL
  chatToken?: string;
}
```

---

### 8. Made-in-China Platform Data

Stored in `platformSpecific` field of UnifiedSupplier.

**Schema** (matches docs/mic.md):

```typescript
interface MadeInChinaPlatformData {
  // Company Details
  mainProducts?: string[];     // ["Sofa", "Compressed Sofa", ...]
  certifications?: string;     // "ODM, OEM, Own Brand"
  capabilityStars?: number;    // 2, 3, 4, or 5

  // Products
  productList?: string[];      // Array of product detail URLs
  productImages?: string[];    // Array of product image URLs

  // Contact
  inquiryUrl?: string;         // Send inquiry URL
  chatId?: string;             // Supplier ID for chat
}
```

---

## State Models

### 9. SearchState

Client-side search state managed by React Context.

**Schema**:

```typescript
interface SearchState {
  // Query State
  query: string;
  page: number;

  // Results State
  aggregatedResults: AggregatedSearchResult | null;
  loading: boolean;
  error: string | null;

  // Filter State
  selectedPlatforms: Set<PlatformType>;
  activeFilters: Record<string, FilterValue>;

  // UI State
  selectedProduct: UnifiedSupplier | null;  // For detail sheet
}
```

**State Transitions**:

```
Initial State:
  query = "", page = 1, loading = false, aggregatedResults = null

User enters search -> dispatch SEARCH_START
  loading = true, error = null

API returns -> dispatch SEARCH_SUCCESS
  loading = false, aggregatedResults = response

API fails -> dispatch SEARCH_ERROR
  loading = false, error = message

User toggles platform -> dispatch TOGGLE_PLATFORM
  selectedPlatforms = updated set, trigger client-side filter

User applies filter -> dispatch APPLY_FILTER
  activeFilters = updated filters, trigger client-side filter

User clicks product -> dispatch SELECT_PRODUCT
  selectedProduct = product (opens detail sheet)
```

---

## API Response Models

### 10. Alibaba API Response

Raw response from Alibaba API (before mapping).

**Schema** (excerpt from docs/alibaba.md):

```typescript
interface AlibabaSearchResponse {
  success: boolean;
  model: {
    offers: AlibabaOffer[];
    totalCount: number;
  };
}

interface AlibabaOffer {
  companyId: string;
  companyName: string;
  companyTitle: string;
  action: string;
  countryCode: string;
  city: string;
  companyIcon: string;
  companyImage: string[];
  verifiedSupplier: boolean;
  verifiedSupplierPro: boolean;
  isFactory: boolean;
  reviewScore: string;
  reviewCount: number;
  onTimeDelivery: string;
  replyAvgTime: string;
  goldYearsNumber: string;
  goldYears: string;
  mainProducts: Array<{ name: string; count: number | null }>;
  productList: Array<{
    action: string;
    productId: string;
    productImg: string;
    price: string;
    moq: string;
  }>;
  contactSupplier: string;
  chatToken: string;
}
```

---

### 11. Made-in-China Parsed Data

Data extracted from HTML (before mapping).

**Schema** (from docs/mic.md):

```typescript
interface MICCompany {
  companyName: string;
  companyUrl: string;
  companyId: string;
  businessType: string | null;
  mainProducts: string[];      // Parsed from comma-separated string
  city: string;
  province: string;
  isAuditedSupplier: boolean;
  capabilityStars: number;
  certifications: string | null;
  companyLogoUrl: string | null;  // Usually null in listings
  inquiryUrl: string;
  chatId: string;
  productList: string[];
  productImages: string[];
}

interface MICSearchResponse {
  success: boolean;
  keyword: string;
  page: number;
  totalCount: string;
  companies: MICCompany[];
}
```

---

## Relationships

```
AggregatedSearchResult
  └─ results: SearchResult[]
       └─ results: UnifiedSupplier[]
            ├─ platform: PlatformType
            ├─ supplier: {...}
            └─ platformSpecific: AlibabaPlatformData | MadeInChinaPlatformData

FilterCriteria
  ├─ platforms: Set<PlatformType>
  └─ filters: { [key]: FilterValue }

SearchState
  ├─ aggregatedResults: AggregatedSearchResult
  ├─ selectedPlatforms: Set<PlatformType>
  ├─ activeFilters: Record<string, FilterValue>
  └─ selectedProduct: UnifiedSupplier | null
```

---

## Normalization Examples

### Example 1: Alibaba Offer → UnifiedSupplier

**Input** (Alibaba API):
```json
{
  "companyId": "281906743",
  "companyName": "Foshan Maotong Home Furnishing Technology Co., Ltd.",
  "action": "//mouton.en.alibaba.com/company_profile.html",
  "city": "Guangdong Province",
  "countryCode": "CN",
  "companyIcon": "https://img.alicdn.com/...icon.png",
  "verifiedSupplier": false,
  "verifiedSupplierPro": false,
  "isFactory": false,
  "goldYears": "2 yrs",
  "reviewScore": "4.7",
  "productList": [{
    "productId": "1601496778544",
    "productImg": "https://s.alicdn.com/...jpg",
    "price": "₹7,704.35-25,589.44",
    "moq": "Min. order: 2 pieces"
  }]
}
```

**Output** (UnifiedSupplier):
```json
{
  "id": "alibaba-281906743-1601496778544",
  "platform": "alibaba",
  "name": "Foshan Maotong Home Furnishing Technology Co., Ltd.",
  "price": "₹7,704.35-25,589.44",
  "currency": "INR",
  "moq": "Min. order: 2 pieces",
  "images": ["https://img.alicdn.com/...icon.png", "https://s.alicdn.com/...jpg"],
  "supplier": {
    "id": "281906743",
    "name": "Foshan Maotong Home Furnishing Technology Co., Ltd.",
    "location": "Guangdong Province, CN",
    "verification": ["Gold 2 yrs"]
  },
  "url": "https://mouton.en.alibaba.com/company_profile.html",
  "platformSpecific": {
    "reviewScore": "4.7",
    "products": [...]
  }
}
```

---

### Example 2: Made-in-China Company → UnifiedSupplier

**Input** (HTML parsing):
```json
{
  "companyName": "Guangzhou Ailin Home Technology Co., LTD",
  "companyUrl": "//ailinsofa.en.made-in-china.com",
  "companyId": "PBkGYzgbCcVN",
  "mainProducts": ["Sofa", "Compressed Sofa", "Living Room Sofa"],
  "city": "Foshan",
  "province": "Guangdong",
  "isAuditedSupplier": false,
  "capabilityStars": 2,
  "productImages": ["https://image.made-in-china.com/...jpg"]
}
```

**Output** (UnifiedSupplier):
```json
{
  "id": "mic-PBkGYzgbCcVN",
  "platform": "madeinchina",
  "name": "Guangzhou Ailin Home Technology Co., LTD",
  "price": null,
  "currency": null,
  "moq": null,
  "images": ["https://image.made-in-china.com/...jpg"],
  "supplier": {
    "id": "PBkGYzgbCcVN",
    "name": "Guangzhou Ailin Home Technology Co., LTD",
    "location": "Foshan, Guangdong",
    "verification": ["2 Stars"]
  },
  "url": "https://ailinsofa.en.made-in-china.com",
  "platformSpecific": {
    "mainProducts": ["Sofa", "Compressed Sofa", "Living Room Sofa"],
    "capabilityStars": 2,
    "productList": [...],
    "inquiryUrl": "..."
  }
}
```

---

## Summary

This data model provides:

1. **Unified Schema**: All platforms map to `UnifiedSupplier` for consistent UI rendering
2. **Extensibility**: Platform-specific data preserved in `platformSpecific` object
3. **Type Safety**: TypeScript interfaces for all entities
4. **Flexibility**: Nullable fields handle missing data gracefully
5. **Separation**: Clear distinction between normalized data and platform-specific data

**Implementation Files**:
- `lib/platforms/types.ts` - Core interfaces (UnifiedSupplier, PlatformType, etc.)
- `lib/platforms/alibaba/types.ts` - Alibaba-specific interfaces
- `lib/platforms/madeinchina/types.ts` - Made-in-China-specific interfaces
- `lib/platforms/alibaba/mapper.ts` - Alibaba → UnifiedSupplier mapping
- `lib/platforms/madeinchina/mapper.ts` - Made-in-China → UnifiedSupplier mapping
