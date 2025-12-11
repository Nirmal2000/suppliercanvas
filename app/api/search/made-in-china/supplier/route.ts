import { NextResponse } from 'next/server';

import { mapMICToUnified } from '@/lib/platforms/madeinchina/mapper';
import { parseMICHTML } from '@/lib/platforms/madeinchina/parser';
import { createProxyAgent } from '@/lib/proxy';

const BASE_URL = 'https://www.made-in-china.com';
const PAGE_SIZE = 20;

export async function GET(request: Request) {
    const url = new URL(request.url);
    const query = url.searchParams.get('query');

    if (!query) {
        return NextResponse.json(
            {
                success: false,
                platform: 'madeinchina',
                error: 'Query parameter is required',
            },
            { status: 400 },
        );
    }

    const page = parsePositiveInteger(url.searchParams.get('page')) ?? 1;
    const targetUrl = buildSearchUrl(query, page);

    try {
        const agent = createProxyAgent();
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.8',
                Referer: BASE_URL,
            },
            // @ts-expect-error - agent is supported in Node.js fetch
            agent,
            cache: 'no-store',
        });

        if (!response.ok) {
            throw new Error(`Made-in-China responded with status ${response.status}`);
        }

        const html = await response.text();
        const parsed = parseMICHTML(html, query, page);
        const normalizedResults = mapMICToUnified(parsed);
        const totalCount = normalizeTotalCount(parsed.totalCount);
        const hasMore = calculateHasMore(totalCount, page, PAGE_SIZE, normalizedResults.length);

        return NextResponse.json({
            success: true,
            platform: 'madeinchina',
            results: normalizedResults,
            totalCount: totalCount ?? normalizedResults.length,
            page,
            hasMore,
        });
    } catch (error) {
        console.error('Made-in-China search proxy failed', error);
        return NextResponse.json(
            {
                success: false,
                platform: 'madeinchina',
                error: 'Made-in-China request failed',
            },
            { status: 500 },
        );
    }
}

function parsePositiveInteger(value: string | null): number | null {
    if (!value) return null;
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return null;
    return parsed > 0 ? parsed : null;
}

function buildSearchUrl(query: string, page: number): string {
    const keywordSegment = encodeURIComponent(query).replace(/%20/g, '+');
    return `${BASE_URL}/company-search/${keywordSegment}/C1/${page}.html`;
}

function normalizeTotalCount(total?: number | string): number | undefined {
    if (typeof total === 'number') {
        return total;
    }

    if (typeof total === 'string') {
        const digits = total.replace(/[^0-9]/g, '');
        if (digits) {
            const parsed = Number(digits);
            if (!Number.isNaN(parsed)) {
                return parsed;
            }
        }
    }

    return undefined;
}

function calculateHasMore(
    totalCount: number | undefined,
    page: number,
    pageSize: number,
    currentCount: number,
): boolean {
    if (typeof totalCount === 'number') {
        return page * pageSize < totalCount;
    }

    return currentCount === pageSize;
}
