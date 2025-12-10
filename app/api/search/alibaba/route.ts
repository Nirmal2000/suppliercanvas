import { NextResponse } from 'next/server';

import { mapAlibabaToUnified } from '@/lib/platforms/alibaba/mapper';
import { AlibabaSearchResponse } from '@/lib/platforms/alibaba/types';

const ALIBABA_ENDPOINT = 'https://www.alibaba.com/search/api/supplierTextSearch';
const DEFAULT_PAGE_SIZE = 20;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get('query');

  if (!query) {
    return NextResponse.json(
      {
        success: false,
        platform: 'alibaba',
        error: 'Query parameter is required',
      },
      { status: 400 },
    );
  }

  const page = parsePositiveInteger(url.searchParams.get('page')) ?? 1;
  const pageSize = Math.min(parsePositiveInteger(url.searchParams.get('pageSize')) ?? DEFAULT_PAGE_SIZE, 100);
  const targetUrl = buildAlibabaUrl(query, page, pageSize);

  try {
    const response = await fetch(targetUrl, {
      headers: {
        accept: 'application/json,text/javascript,*/*;q=0.01',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Alibaba responded with status ${response.status}`);
    }

    const payload = (await response.json()) as AlibabaSearchResponse;
    const normalizedResults = mapAlibabaToUnified(payload);
    const totalCount = payload.model?.totalCount;
    const hasMore = calculateHasMore(totalCount, page, pageSize, normalizedResults.length);

    return NextResponse.json({
      success: true,
      platform: 'alibaba',
      results: normalizedResults,
      totalCount: totalCount ?? normalizedResults.length,
      page,
      hasMore,
    });
  } catch (error) {
    console.error('Alibaba search proxy failed', error);
    return NextResponse.json(
      {
        success: false,
        platform: 'alibaba',
        error: 'Alibaba API request failed',
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

function buildAlibabaUrl(query: string, page: number, pageSize: number): string {
  const endpoint = new URL(ALIBABA_ENDPOINT);
  const mirroredQueryParams = [
    'productQpKeywords',
    'queryProduct',
    'supplierQpKeywords',
    'supplierQpProductName',
    'productName',
    'queryRaw',
    'query',
    'queryMachineTranslate',
  ];

  mirroredQueryParams.forEach((param) => endpoint.searchParams.set(param, query));

  endpoint.searchParams.set('pageSize', pageSize.toString());
  endpoint.searchParams.set('page', page.toString());
  endpoint.searchParams.set('from', 'pcHomeContent');
  endpoint.searchParams.set('langident', 'en');
  endpoint.searchParams.set('verifiedManufactory', 'false');
  endpoint.searchParams.set('pro', 'false');
  endpoint.searchParams.set('productAttributes', '');
  endpoint.searchParams.set('intention', '');
  endpoint.searchParams.set('supplierAttributes', '');
  endpoint.searchParams.set('requestId', createRequestId());
  endpoint.searchParams.set('startTime', Date.now().toString());

  return endpoint.toString();
}

function createRequestId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `AI_Web_${crypto.randomUUID()}_${Date.now()}`;
  }

  return `AI_Web_${Math.random().toString(36).slice(2)}_${Date.now()}`;
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
