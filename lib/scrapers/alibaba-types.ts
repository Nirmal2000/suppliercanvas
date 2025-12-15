/**
 * Alibaba Scraper Types
 * Data structures for parsing Alibaba supplier pages
 */

export interface AlibabaProductGroup {
    name: string;
    url: string;
    id: string;
    isLeaf: boolean;
    children?: AlibabaProductGroup[];
}

export interface AlibabaProductItem {
    id: string;
    title: string;
    url: string;
    price?: string;
    moq?: string;
}

export interface AlibabaPricingTier {
    quantity: string;
    price: string;
}

export interface AlibabaLeadTime {
    quantity: string;
    days: string;
}

export interface AlibabaVariation {
    name: string;
    options: {
        label: string;
        imageUrl?: string;
    }[];
}

export interface AlibabaProductDetail {
    id: string;
    url: string;
    title: string;
    pricing: AlibabaPricingTier[];
    attributes: Record<string, string>;
    specs: {
        name: string;
        values: { label: string; imageUrl?: string }[];
    }[];
    mediaUrls: string[];
    supplierName?: string;
    supplierLocation?: string;
    leadTime?: AlibabaLeadTime[];
    variations?: AlibabaVariation[];
    certifications?: string[];
    customization?: string[];
}
