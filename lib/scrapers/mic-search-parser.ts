import * as cheerio from 'cheerio';
import { Product } from './mic-types';

export function parseMicSearchResults(html: string, sourceUrl: string, keyword: string): Product[] {
    const $ = cheerio.load(html);
    const products: Product[] = [];

    $('.prod-result-item').each((_, element) => {
        try {
            const $el = $(element);
            const titleLink = $el.find('.prod-title a');
            const title = titleLink.text().trim();
            const link = titleLink.attr('href') || '';

            // Image handling: look for data-original first (lazy load), then src
            const imgEl = $el.find('.prod-image img');
            let image = imgEl.attr('data-original') || imgEl.attr('src') || '';
            if (image && image.startsWith('//')) {
                image = 'https:' + image;
            }

            const price = $el.find('.prod-price .value').text().trim();
            const priceUnit = $el.find('.prod-price .unit').text().trim();
            const fullPrice = price ? `${price} ${priceUnit}` : '';

            const moq = $el.find('.min-order .value').text().trim();

            if (title && link) {
                products.push({
                    title,
                    url: link.startsWith('http') ? link : new URL(link, sourceUrl).toString(),
                    image,
                    price: fullPrice,
                    moq,
                    minOrder: moq,
                    source: 'MIC',
                    metadata: {
                        searchKeyword: keyword,
                        supplierUrl: sourceUrl
                    }
                });
            }
        } catch (e) {
            console.error('Error parsing product item:', e);
        }
    });

    return products;
}
