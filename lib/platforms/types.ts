export type PlatformType = 'alibaba' | 'madeinchina';
export type SearchInputType = 'text' | 'image';

export interface SearchInput {
  id: string;
  type: SearchInputType;
  value: string; // text query or image name
  file?: File; // for client-side usage, might not be serializable from server
}

export interface UnifiedSupplier {
  id: string;
  platform: PlatformType;
  name: string;
  description?: string;
  price: string | null;
  currency: string | null;
  moq: string | null;
  images: string[];
  products: UnifiedProduct[];
  supplier: {
    id: string;
    name: string;
    location?: string;
    verification: string[];
    url?: string;
  };
  url: string;
  platformSpecific: Record<string, unknown>;
  matchedInputIds?: string[];
}

export interface UnifiedProduct {
  id: string;
  platform: PlatformType;
  title: string;
  image: string;
  images: string[];
  price: string | null;
  currency: string | null;
  moq: string | null;
  productUrl: string;
  attributes: Record<string, string>;
  supplier: {
    id: string;
    name: string;
    url: string;
    location?: string;
    badges?: string[];
  };
  platformSpecific: Record<string, unknown>;
}

export interface SearchResult {
  platform: PlatformType;
  success: boolean;
  results: UnifiedSupplier[];
  error?: string;
  totalCount?: number;
  page: number;
  hasMore: boolean;
  sourceInputId?: string;
}

export interface AggregatedSearchResult {
  inputs: SearchInput[];
  results: UnifiedSupplier[]; // Flattened results for unified view
  timestamp: number;
}

export interface PlatformAdapter {
  platform: PlatformType;
  search(query: string, page?: number): Promise<SearchResult>;
  mapToUnified(payload: unknown): UnifiedSupplier[];
}

export type FilterType = 'select' | 'range' | 'boolean';

export interface FilterDefinition {
  id: string;
  label: string;
  type: FilterType;
  platform: PlatformType;
  options?: { label: string; value: string | number | boolean }[];
  min?: number;
  max?: number;
  unit?: string;
}

export interface FilterValue {
  filterId: string;
  value: string | number | boolean | { min: number; max: number };
}

export interface FilterCriteria {
  platform: PlatformType;
  filters: FilterValue[];
}
