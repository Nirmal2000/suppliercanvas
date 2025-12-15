import { NextRequest } from 'next/server';
import { parseMicSearchResults } from '@/lib/scrapers/mic-search-parser';
import { getCachedHtml, setCachedHtml } from '@/lib/scrapers/firecrawl-cache';

// Reusing the same Firecrawl configuration
const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v2/scrape';
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY || '';

interface GodViewRequest {
    urls: string[];
    keywords: string[];
    page?: number;
}

export async function POST(request: NextRequest) {
    const { urls, keywords, page = 1 } = await request.json() as GodViewRequest;

    if (!urls?.length || !keywords?.length) {
        return new Response('URLs and Keywords are required', { status: 400 });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            try {
                // Iterate through every combination of URL and Keyword
                for (const url of urls) {
                    // Clean URL - remove trailing slash if present
                    const baseUrl = url.endsWith('/') ? url.slice(0, -1) : url;

                    for (const keyword of keywords) {
                        const searchUrl = `${baseUrl}/product/keywordSearch?word=${encodeURIComponent(keyword.trim())}&pageNumber=${page}&pageSize=48`;

                        try {
                            // Check cache
                            let html = await getCachedHtml(searchUrl);

                            if (!html) {
                                // Fetch from Firecrawl
                                const response = await fetch(FIRECRAWL_API_URL, {
                                    method: 'POST',
                                    headers: {
                                        'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                        url: searchUrl,
                                        onlyMainContent: false,
                                        formats: ['html'],
                                        waitFor: 1000,
                                    }),
                                });

                                if (response.ok) {
                                    const data = await response.json();
                                    if (data.success && data.data?.html) {
                                        html = data.data.html;
                                        // Cache the result
                                        await setCachedHtml(searchUrl, html || '');
                                    }
                                }
                            }

                            if (html) {
                                const products = parseMicSearchResults(html, baseUrl, keyword);
                                if (products.length > 0) {
                                    // Send products as a JSON chunk line
                                    const chunk = JSON.stringify(products) + '\n';
                                    controller.enqueue(encoder.encode(chunk));
                                }
                            }

                        } catch (error) {
                            console.error(`Error scraping ${searchUrl}:`, error);
                            // We continue to next item even if one fails
                        }
                    }
                }
            } catch (error) {
                console.error('Stream error:', error);
                controller.error(error);
            } finally {
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'application/x-ndjson',
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache',
        },
    });
}
