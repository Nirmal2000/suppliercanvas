import { NextRequest, NextResponse } from 'next/server';
import { getCachedHtml, setCachedHtml } from '@/lib/scrapers/firecrawl-cache';
import { parseProductDetail } from '@/lib/scrapers/mic-parser';
import { ProductDetail } from '@/lib/scrapers/mic-types';
import { firecrawlQueue } from '@/lib/scrapers/firecrawl-queue';

// Reusing the same Firecrawl configuration
const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v2/scrape';
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY || '';

export async function POST(request: NextRequest) {
    try {
        const { url } = await request.json();

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        // Wrap the entire scraping operation in the queue
        return await firecrawlQueue.add(async () => {
            let html = await getCachedHtml(url);

            if (!html) {
                const response = await fetch(FIRECRAWL_API_URL, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        url,
                        onlyMainContent: false,
                        formats: ['html'],
                        waitFor: 1000,
                    }),
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Firecrawl API error:', errorText);
                    return NextResponse.json({ error: 'Failed to fetch content from Firecrawl' }, { status: response.status });
                }

                const data = await response.json();
                if (data.success && data.data?.html) {
                    html = data.data.html;
                    await setCachedHtml(url, html || '');
                } else {
                    return NextResponse.json({ error: 'Failed to retrieve HTML' }, { status: 500 });
                }
            }

            if (!html) {
                return NextResponse.json({ error: 'No HTML content found' }, { status: 404 });
            }

            const detail: ProductDetail = parseProductDetail(html, url);
            return NextResponse.json(detail);
        });

    } catch (error) {
        console.error('Error in product detail scrape:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
