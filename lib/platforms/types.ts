export type PlatformType = 'alibaba' | 'madeinchina';

export interface UnifiedProduct {
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
  platformSpecific: Record<string, unknown>;
}

export interface SearchResult {
  platform: PlatformType;
  success: boolean;
  results: UnifiedProduct[];
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
  search(query: string, page?: number): Promise<SearchResult>;
  mapToUnified(payload: unknown): UnifiedProduct[];
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
