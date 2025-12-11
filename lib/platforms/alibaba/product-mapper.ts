import { UnifiedProduct } from '../types';

export function mapAlibabaToUnifiedProduct(rawOffer: any): UnifiedProduct {
    // Use the nested productList item if available as the main source, otherwise the offer itself
    // Typically the offer object *is* the product representation in the search list.
    // But sometimes there's a productList. For search results, usually 'offers' list contains 
    // items that represent a product/supplier combo.

    const product = rawOffer; // The raw item from the 'offers' array

    // Extract ID
    const id = String(product.id || product.productId || product.adInfo?.creativeInfo?.mainProduct?.[0]?.id || 'unknown');

    // Extract Title
    const title = product.title || product.adInfo?.adTitleText || product.adInfo?.creativeInfo?.adTitleText || 'Untitled Product';

    // Extract Price
    const price = product.price || product.promotionPrice || product.adInfo?.creativeInfo?.mainProduct?.[0]?.price || null;

    // Extract Image
    const image =
        product.mainImage ||
        product.imageUrl ||
        product.adInfo?.creativeInfo?.mainProduct?.[0]?.imageUrl ||
        '';

    // Extract Images (multi-image)
    const images = product.multiImage || [image];
    if (images.length === 0 && image) images.push(image);

    // Extract URL
    let productUrl = product.productUrl || product.url || product.clickEurl || product.eurl || product.adInfo?.creativeInfo?.mainProduct?.[0]?.action || '';
    if (productUrl && !productUrl.startsWith('http')) {
        if (productUrl.startsWith('//')) productUrl = 'https:' + productUrl;
        else if (productUrl.startsWith('/')) productUrl = 'https://www.alibaba.com' + productUrl;
    }

    // Extract MOQ
    const moq = product.moq || product.moqV2 || null;

    // Extract Supplier Info
    const supplierId = product.companyId || product.supplier?.companyId || 'unknown';
    const supplierName = product.companyName || product.supplier?.companyName || 'Unknown Supplier';
    const supplierUrl = product.supplierHref || product.supplierHomeHref || product.contactSupplier || '';

    // Extract Badges/Verification
    const badges: string[] = [];
    if (product.goldSupplierYears) badges.push(product.goldSupplierYears);
    if (product.tradeProduct) badges.push('Trade Assurance');
    // Add other badges logic if needed from raw data

    // Attributes - map flat generic fields or specific lists
    const attributes: Record<string, string> = {};
    if (product.reviewScore) attributes['Review Score'] = product.reviewScore;
    if (product.reviewCount) attributes['Review Count'] = product.reviewCount;
    // If there are other attribute lists in the raw JSON, map them here.
    // Based on structure json, there might be 'productAuthTagData' or similar in larger context, 
    // but usually generic attributes are sparse in the search list.

    return {
        id,
        platform: 'alibaba',
        title,
        image,
        images: images.filter((img: string) => !!img),
        price,
        currency: detectCurrency(price),
        moq,
        productUrl,
        attributes,
        supplier: {
            id: supplierId,
            name: supplierName,
            url: supplierUrl,
            location: product.countryCode || undefined, // Often country code is used for location
            badges,
        },
        platformSpecific: product, // Store the ENTIRE raw object here
    };
}

function detectCurrency(price: string | null): string | null {
    if (!price) return null;
    const normalized = price.trim();
    if (/US\s?\$|USD/i.test(normalized)) return 'USD';
    if (normalized.startsWith('$')) return 'USD';
    if (normalized.startsWith('₹')) return 'INR';
    if (normalized.startsWith('€')) return 'EUR';
    if (normalized.startsWith('£')) return 'GBP';
    return null;
}
