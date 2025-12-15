import { NextRequest, NextResponse } from 'next/server';
import type { ScrapeRequest, ScrapeResponse } from '@/lib/scrapers/mic-types';

const FIRECRAWL_API_URL = 'https://api.firecrawl.dev/v2/scrape';
const FIRECRAWL_API_KEY = 'fc-102ab0c2a1d6406696e1eb6ecdf1a7cb';

export async function POST(request: NextRequest): Promise<NextResponse<ScrapeResponse>> {
    try {
        const body = await request.json() as ScrapeRequest;

        if (!body.url) {
            return NextResponse.json({ success: false, error: 'URL is required' }, { status: 400 });
        }

        // Ensure URL has protocol
        let url = body.url;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = `https://${url}`;
        }

        const response = await fetch(FIRECRAWL_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url,
                onlyMainContent: false,
                maxAge: 172800000, // 48 hours cache
                formats: ['html'],
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Firecrawl API error:', errorText);
            return NextResponse.json({
                success: false,
                error: `Firecrawl API error: ${response.status}`
            }, { status: response.status });
        }

        const data = await response.json();

        if (!data.success || !data.data?.html) {
            return NextResponse.json({
                success: false,
                error: 'Failed to get HTML from Firecrawl'
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            html: data.data.html
        });

    } catch (error) {
        console.error('Scrape error:', error);
        return NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
