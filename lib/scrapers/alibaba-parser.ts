/**
 * Alibaba HTML Parser
 * Cheerio-based parser for Alibaba supplier pages
 */

import * as cheerio from 'cheerio';
import type {
    AlibabaProductGroup,
    AlibabaProductItem,
    AlibabaProductDetail,
    AlibabaPricingTier,
    AlibabaLeadTime,
    AlibabaVariation,
} from './alibaba-types';

/**
 * Parse product groups from supplier product list page
 * Extracts navigation menu items and identifies leaf categories
 */
export function parseProductGroups(html: string): AlibabaProductGroup[] {
    const $ = cheerio.load(html);
    const groups: AlibabaProductGroup[] = [];

    // Parse menu items from the navigation
    $('.next-menu-item.menu-item').each((_, el) => {
        const $el = $(el);
        const $link = $el.find('a.menu-link');
        const name = $link.attr('title') || $link.text().trim();
        const url = $link.attr('href') || '';
        const id = $el.attr('data-name') || '';

        if (name && url && name !== 'See all categories') {
            groups.push({
                name,
                url,
                id,
                isLeaf: true, // Menu items without submenus are leaves
            });
        }
    });

    // Parse submenu items (categories with children)
    $('.next-menu-submenu-item-popup').each((_, el) => {
        const $el = $(el);
        const $titleLink = $el.find('.next-menu-submenu-title .menu-link');
        const name = $titleLink.attr('title') || $titleLink.text().trim();
        const url = $titleLink.attr('href') || '';
        const id = $el.find('.next-menu[data-name]').attr('data-name') || '';

        const children: AlibabaProductGroup[] = [];

        // Parse child items
        $el.find('.sub-menu-item').each((_, childEl) => {
            const $child = $(childEl);
            const $childLink = $child.find('a.menu-link');
            const childName = $childLink.attr('title') || $childLink.text().trim();
            const childUrl = $childLink.attr('href') || '';
            const childId = $child.attr('data-name') || '';

            if (childName && childUrl) {
                children.push({
                    name: childName,
                    url: childUrl,
                    id: childId,
                    isLeaf: true,
                });
            }
        });

        if (name && url) {
            groups.push({
                name,
                url,
                id,
                isLeaf: children.length === 0,
                children: children.length > 0 ? children : undefined,
            });
        }
    });

    return groups;
}

/**
 * Get all leaf groups (groups without children)
 */
export function getLeafGroups(groups: AlibabaProductGroup[]): AlibabaProductGroup[] {
    const leaves: AlibabaProductGroup[] = [];

    for (const group of groups) {
        if (group.children && group.children.length > 0) {
            leaves.push(...getLeafGroups(group.children));
        } else if (group.isLeaf) {
            leaves.push(group);
        }
    }

    return leaves;
}

/**
 * Parse product list from a product group page
 * Extracts product cards with basic info
 */
export function parseProductList(html: string): AlibabaProductItem[] {
    const $ = cheerio.load(html);
    const products: AlibabaProductItem[] = [];

    $('.icbu-product-card').each((_, el) => {
        const $card = $(el);
        const id = $card.attr('data-id') || '';

        const $titleLink = $card.find('.product-info .title-link');
        const title = $titleLink.attr('title') || $titleLink.find('.title-con').text().trim();
        const url = $titleLink.attr('href') || '';

        const price = $card.find('.price .num').text().trim();
        const moq = $card.find('.moq').text().trim().replace('Min. order ', '');

        if (id && url) {
            products.push({
                id,
                title,
                url,
                price: price || undefined,
                moq: moq || undefined,
            });
        }
    });

    return products;
}

/**
 * Parse detailed product information from product detail page
 */
export function parseProductDetail(html: string, url: string): AlibabaProductDetail {
    const $ = cheerio.load(html);

    // Extract product ID from URL
    const idMatch = url.match(/_(\d+)\.html/);
    const id = idMatch ? idMatch[1] : '';

    // Title
    const title = $('h1').first().attr('title') || $('h1').first().text().trim();

    // Supplier info
    const supplierName = $('.product-company .company-name a').attr('title') ||
        $('.product-company .company-name a').text().trim();
    const supplierLocation = $('.product-company .register-country').text().trim();

    // Pricing tiers
    const pricing: AlibabaPricingTier[] = [];
    $('[data-testid="ladder-price"] .price-item').each((_, el) => {
        const $item = $(el);
        // Look for quantity text in the first div
        const quantityDiv = $item.children('div').first();
        const quantity = quantityDiv.text().trim();
        // Look for price in the second div's span
        const priceDiv = $item.children('div').last();
        const price = priceDiv.find('span').first().text().trim();

        if (quantity && price) {
            pricing.push({ quantity, price });
        }
    });

    // Images
    const mediaUrls: string[] = [];

    // Main product image
    const mainImage = $('[data-submodule="ProductImageMain"] img').attr('src') ||
        $('.current-main-image img').attr('src');
    if (mainImage) {
        mediaUrls.push(mainImage);
    }

    // Thumbnail images
    $('[data-submodule="ProductImageThumbsList"] img').each((_, el) => {
        const src = $(el).attr('src');
        if (src && !mediaUrls.includes(src)) {
            // Convert thumbnail URL to full size
            const fullSrc = src.replace(/_\d+x\d+\./, '.');
            mediaUrls.push(fullSrc);
        }
    });

    // Also check for images in style backgrounds
    $('[data-submodule="ProductImageThumbsList"] [style*="background-image"]').each((_, el) => {
        const style = $(el).attr('style') || '';
        const urlMatch = style.match(/url\(([^)]+)\)/);
        if (urlMatch) {
            const imgUrl = urlMatch[1].replace(/["']/g, '');
            if (!mediaUrls.includes(imgUrl)) {
                mediaUrls.push(imgUrl);
            }
        }
    });

    // Key attributes
    const attributes: Record<string, string> = {};
    $('[data-testid="module-attribute"] .id-grid > div').each((_, el) => {
        const $row = $(el);
        const label = $row.find('.id-bg-\\[\\#f8f8f8\\]').attr('title') ||
            $row.find('.id-bg-\\[\\#f8f8f8\\] .id-line-clamp-2').text().trim();
        const value = $row.find('.id-font-medium').attr('title') ||
            $row.find('.id-font-medium .id-line-clamp-2').text().trim();

        if (label && value) {
            attributes[label] = value;
        }
    });

    // Lead time
    const leadTime: AlibabaLeadTime[] = [];
    const $leadTable = $('.lead-layout table');
    if ($leadTable.length) {
        const quantities: string[] = [];
        const days: string[] = [];

        $leadTable.find('tr').first().find('td').each((i, el) => {
            if (i > 0) quantities.push($(el).text().trim());
        });
        $leadTable.find('tr').last().find('td').each((i, el) => {
            if (i > 0) days.push($(el).text().trim());
        });

        for (let i = 0; i < quantities.length; i++) {
            if (quantities[i] && days[i]) {
                leadTime.push({ quantity: quantities[i], days: days[i] });
            }
        }
    }

    // Variations (SKU options)
    const variations: AlibabaVariation[] = [];
    $('[data-testid="sku-list"]').each((_, el) => {
        const $list = $(el);
        const nameText = $list.find('[data-testid="sku-list-title"]').text().trim();
        // Extract name from "color: Color 1" format
        const nameMatch = nameText.match(/^([^:]+)/);
        const name = nameMatch ? nameMatch[1].trim() : nameText;

        const options: { label: string; imageUrl?: string }[] = [];
        $list.find('[data-testid="sku-list-item"] > div').each((_, optEl) => {
            const $opt = $(optEl);
            const img = $opt.find('img');
            const label = img.attr('alt') || $opt.find('span').text().trim();
            const imageUrl = img.attr('src');

            if (label) {
                options.push({ label, imageUrl });
            }
        });

        if (name && options.length > 0) {
            variations.push({ name, options });
        }
    });

    // Certifications
    const certifications: string[] = [];
    $('.certification-layout .certification-cols .info span').each((_, el) => {
        const cert = $(el).text().trim();
        if (cert) certifications.push(cert);
    });

    // Customization options
    const customization: string[] = [];
    $('.other-customization .id-flex-col > div').each((_, el) => {
        const text = $(el).find('span').first().text().trim();
        if (text) customization.push(text);
    });

    return {
        id,
        url,
        title,
        pricing,
        attributes,
        specs: [], // Alibaba doesn't have a separate specs section like MIC
        mediaUrls,
        supplierName: supplierName || undefined,
        supplierLocation: supplierLocation || undefined,
        leadTime: leadTime.length > 0 ? leadTime : undefined,
        variations: variations.length > 0 ? variations : undefined,
        certifications: certifications.length > 0 ? certifications : undefined,
        customization: customization.length > 0 ? customization : undefined,
    };
}

/**
 * Construct product list URL from supplier URL
 */
export function getProductListUrl(supplierUrl: string): string {
    // Ensure URL has protocol
    if (!supplierUrl.startsWith('http')) {
        supplierUrl = 'https://' + supplierUrl;
    }

    const url = new URL(supplierUrl);

    // If it's already a product list URL, return as is
    if (url.pathname.includes('productlist')) {
        return supplierUrl;
    }

    // Construct product list URL
    return `${url.origin}/productlist.html`;
}
