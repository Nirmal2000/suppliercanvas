import { UnifiedProduct } from '../types';

export function mapMicToUnifiedProduct(rawProduct: any): UnifiedProduct {
    // rawProduct corresponds to the object constructed in the MIC route scraper

    // Extract ID - usually not explicit in scrape, so use hash or just url part
    const id = rawProduct.productUrl ? extractMicId(rawProduct.productUrl) : 'unknown-' + Math.random().toString(36).substr(2, 9);

    return {
        id: id,
        platform: 'madeinchina',
        title: rawProduct.title || 'Untitled Product',
        image: rawProduct.imageUrl || '',
        images: [rawProduct.imageUrl].filter(Boolean), // MIC scraper currently only gets one main image per list item
        price: rawProduct.price || null,
        currency: detectCurrency(rawProduct.price),
        moq: rawProduct.moq || null,
        productUrl: rawProduct.productUrl || '',
        attributes: rawProduct.attributes || {},
        supplier: {
            id: extractMicCompanyId(rawProduct.companyUrl, rawProduct.companyName),
            name: rawProduct.companyName || 'Unknown Supplier',
            url: rawProduct.companyUrl || '',
            location: rawProduct.location,
            badges: rawProduct.badges || [],
        },
        platformSpecific: rawProduct, // Store ALL raw data
    };
}

function extractMicId(url: string): string {
    // URL format often like: https://company.made-in-china.com/product/Product-Name-ID.html
    // or https://www.made-in-china.com/showroom/company-product-detail/Product-Name-ID.html
    try {
        const match = url.match(/-([a-zA-Z0-9]+)\.html$/);
        return match ? match[1] : 'mic-' + Math.random().toString(36).substr(2, 9);
    } catch {
        return 'mic-' + Math.random().toString(36).substr(2, 9);
    }
}

function extractMicCompanyId(url: string, name: string): string {
    // Try to get unique part from subdomain or URL
    if (url) {
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname; // e.g., company.made-in-china.com
            const parts = hostname.split('.');
            if (parts.length >= 3 && parts[1] === 'made-in-china') {
                return parts[0];
            }
        } catch { }
    }
    return name ? name.replace(/\s+/g, '-').toLowerCase() : 'unknown-supplier';
}

function detectCurrency(price: string | null): string | null {
    if (!price) return null;
    const normalized = price.trim();
    if (/US\s?\$|USD/i.test(normalized)) return 'USD';
    if (normalized.startsWith('$')) return 'USD';
    return null;
}
