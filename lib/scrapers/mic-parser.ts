import * as cheerio from 'cheerio';
import type {
    ProductGroup,
    ProductItem,
    ProductDetail,
    PricingTier,
    ProductSpec
} from './mic-types';

/**
 * Parse product groups from a supplier's product list page
 * URL pattern: {supplier}.en.made-in-china.com/product-list-1.html
 */
export function parseProductGroups(html: string): ProductGroup[] {
    const $ = cheerio.load(html);
    const groups: ProductGroup[] = [];

    // Find the product groups sidebar
    $('.sr-side-proGroup-list > li').each((_, li) => {
        const $li = $(li);
        const $link = $li.find('> a').first();

        if (!$link.length) return;

        const name = $link.text().trim();
        const url = $link.attr('href') || '';

        // Check if this is a leaf node (no children/subcategories)
        // Leaf nodes don't have the right arrow icon indicating children
        const hasIcon = $link.find('.icon-right, .J-showSubList').length > 0;
        const $sublist = $li.find('.sr-side-proGroup-sublist');
        const isLeaf = !hasIcon || $sublist.length === 0;

        // Parse children if they exist
        const children: ProductGroup[] = [];
        if ($sublist.length > 0) {
            $sublist.find('> li > a').each((_, childLink) => {
                const $childLink = $(childLink);
                children.push({
                    name: $childLink.text().trim(),
                    url: $childLink.attr('href') || '',
                    isLeaf: true, // Subcategories are always leaf nodes
                });
            });
        }

        // Only include actual product groups (not featured lists)
        if (url.includes('product-group')) {
            groups.push({
                name,
                url,
                isLeaf,
                children: children.length > 0 ? children : undefined,
            });
        }
    });

    return groups;
}

/**
 * Parse product items from a product group page
 * URL pattern: {supplier}.en.made-in-china.com/product-group/{id}/{name}-1.html
 */
export function parseProductList(html: string): ProductItem[] {
    const $ = cheerio.load(html);
    const products: ProductItem[] = [];

    $('.prod-result-item, .J-prod-result-item').each((_, item) => {
        const $item = $(item);

        // Get product ID from data attribute
        const id = $item.attr('data-prodid') || '';
        if (!id) return;

        // Get title and URL
        const $titleLink = $item.find('.prod-title a').first();
        const title = $titleLink.attr('title') || $titleLink.text().trim();
        const url = $titleLink.attr('href') || '';

        // Get image URL (from data-original for lazy loaded images, or src)
        const $img = $item.find('.prod-image img').first();
        let imageUrl = $img.attr('data-original') || $img.attr('src') || '';
        if (imageUrl.startsWith('//')) {
            imageUrl = `https:${imageUrl}`;
        }

        // Get price
        const $price = $item.find('.prod-price');
        const priceRange = $price.attr('title') || $price.text().trim();

        // Get min order
        const $minOrder = $item.find('.min-order');
        const minOrder = $minOrder.attr('title') || $minOrder.text().trim();

        products.push({
            id,
            title,
            url,
            imageUrl,
            priceRange,
            minOrder,
        });
    });

    return products;
}

/**
 * Parse detailed product information from a product detail page
 */
export function parseProductDetail(html: string, productUrl: string): ProductDetail {
    const $ = cheerio.load(html);

    // Extract product ID from URL
    const idMatch = productUrl.match(/\/product\/([^/]+)\//);
    const id = idMatch ? idMatch[1] : '';

    // Get title
    const title = $('.sr-proMainInfo-baseInfoH1 span').last().text().trim() ||
        $('h1.sr-proMainInfo-baseInfoH1').text().trim();

    // Get pricing tiers
    const pricing: PricingTier[] = [];
    $('.swiper-slide-div').each((_, slide) => {
        const $slide = $(slide);
        const price = $slide.find('.swiper-money-container').text().trim();
        const quantity = $slide.find('.swiper-unit-container').text().trim();
        if (price && quantity) {
            pricing.push({ price, quantity });
        }
    });

    // Get product specifications/variants
    const specs: ProductSpec[] = [];
    $('.prod-spec-item').each((_, specItem) => {
        const $specItem = $(specItem);
        const name = $specItem.find('.prod-spec-name').text().trim();
        const values: { label: string; imageUrl?: string }[] = [];

        $specItem.find('.prod-spec-value-item').each((_, valueItem) => {
            const $valueItem = $(valueItem);
            const $img = $valueItem.find('img');
            const label = $img.attr('alt') || $valueItem.text().trim();
            let imageUrl = $img.attr('src');
            if (imageUrl?.startsWith('//')) {
                imageUrl = `https:${imageUrl}`;
            }
            values.push({ label, imageUrl });
        });

        if (name && values.length > 0) {
            specs.push({ name, values });
        }
    });

    // Get product attributes from table
    const attributes: Record<string, string> = {};
    $('.sr-proMainInfo-baseInfo-propertyAttr table tr').each((_, row) => {
        const $row = $(row);
        const label = $row.find('th').text().trim().replace(/:$/, '');
        const value = $row.find('td').text().trim();
        if (label && value) {
            attributes[label] = value;
        }
    });

    // Get all media URLs (images)
    const mediaUrls: string[] = [];
    const seenUrls = new Set<string>();

    // Main product images from slider
    $('.J-pic-item img, .sr-proMainInfo-slide-picItem img').each((_, img) => {
        let url = $(img).attr('src') || $(img).attr('data-original') || '';
        if (url.startsWith('//')) {
            url = `https:${url}`;
        }
        // Convert to higher resolution if possible
        url = url.replace(/\/\d+f\d+j\d+\//, '/2f0j00/');

        if (url && !seenUrls.has(url) && !url.includes('transparent.png')) {
            seenUrls.add(url);
            mediaUrls.push(url);
        }
    });

    // Also check fsrc attributes on slide containers
    $('.J-pic-item[fsrc], .sr-proMainInfo-slide-picItem[fsrc]').each((_, item) => {
        let url = $(item).attr('fsrc') || '';
        if (url.startsWith('//')) {
            url = `https:${url}`;
        }
        if (url && !seenUrls.has(url)) {
            seenUrls.add(url);
            mediaUrls.push(url);
        }
    });

    // Get supplier info
    const supplierName = $('.sr-comInfo-title a').text().trim() ||
        $('.sr-com-info .title-txt a').text().trim();
    const supplierLocation = $('.company-location .tip-con').text().trim() ||
        $('.detail-address').text().trim();

    return {
        id,
        title,
        url: productUrl,
        pricing,
        specs,
        attributes,
        mediaUrls,
        supplierName: supplierName || undefined,
        supplierLocation: supplierLocation || undefined,
    };
}

/**
 * Build the product list URL from a supplier URL
 */
export function getProductListUrl(supplierUrl: string): string {
    let url = supplierUrl;
    if (!url.startsWith('http')) {
        url = `https://${url}`;
    }
    // Remove trailing slash
    url = url.replace(/\/$/, '');
    // Append product-list path if not present
    if (!url.includes('/product-list')) {
        url = `${url}/product-list-1.html`;
    }
    return url;
}

/**
 * Get the next page URL from a product group/list URL
 * URL pattern: {base}-{page}.html -> {base}-{page+1}.html
 */
export function getNextPageUrl(currentUrl: string): string | null {
    // Match pattern like -1.html, -2.html, etc.
    const match = currentUrl.match(/(.+)-(\d+)(\.html)$/);
    if (!match) return null;

    const [, base, pageStr, ext] = match;
    const nextPage = parseInt(pageStr, 10) + 1;
    return `${base}-${nextPage}${ext}`;
}

/**
 * Get page number from URL
 */
export function getPageNumber(url: string): number {
    const match = url.match(/-(\d+)\.html$/);
    return match ? parseInt(match[1], 10) : 1;
}
