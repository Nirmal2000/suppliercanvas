/**
 * Types for Made-in-China supplier scraping
 */

export interface ProductGroup {
    name: string;
    url: string;
    isLeaf: boolean;
    children?: ProductGroup[];
}

export interface ProductItem {
    id: string;
    title: string;
    url: string;
    imageUrl: string;
    priceRange: string;
    minOrder: string;
}

export interface PricingTier {
    quantity: string;
    price: string;
}

export interface ProductSpec {
    name: string;
    values: { label: string; imageUrl?: string }[];
}

export interface ProductDetail {
    id: string;
    title: string;
    url: string;
    pricing: PricingTier[];
    specs: ProductSpec[];
    attributes: Record<string, string>;
    mediaUrls: string[];
    supplierName?: string;
    supplierLocation?: string;
}

export interface ScrapeRequest {
    url: string;
}

export interface ScrapeResponse {
    success: boolean;
    html?: string;
    error?: string;
}
