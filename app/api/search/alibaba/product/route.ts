
import { NextRequest, NextResponse } from "next/server";
import { searchAlibabaText, searchAlibabaImage } from "@/lib/platforms/alibaba/service";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query') || searchParams.get('keywords');
    const page = parsePositiveInteger(searchParams.get('page')) || 1;

    if (!query) {
        return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    try {
        const { unifiedProducts, totalCount } = await searchAlibabaText(query, page);

        // Estimate hasMore
        const hasMore = calculateHasMore(totalCount, page, unifiedProducts.length);

        return NextResponse.json({
            source: "alibaba",
            query,
            count: unifiedProducts.length,
            page,
            hasMore,
            totalCount,
            products: unifiedProducts
        });

    } catch (error: any) {
        console.error("API Error:", error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

function parsePositiveInteger(value: string | null): number | null {
    if (!value) return null;
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return null;
    return parsed > 0 ? parsed : null;
}

function calculateHasMore(totalCount: number | undefined, page: number, currentCount: number): boolean {
    const PAGE_SIZE = 40;
    if (typeof totalCount === 'number') {
        return page * PAGE_SIZE < totalCount;
    }
    return currentCount >= PAGE_SIZE;
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("image") as File;
        const page = parsePositiveInteger(request.nextUrl.searchParams.get("page")) || 1;

        if (!file) {
            return NextResponse.json(
                { error: "Image file is required" },
                { status: 400 }
            );
        }

        const { unifiedProducts, totalCount } = await searchAlibabaImage(file, page);
        const hasMore = calculateHasMore(totalCount, page, unifiedProducts.length);

        return NextResponse.json({
            source: "alibaba",
            query: "image-search",
            count: unifiedProducts.length,
            page,
            hasMore,
            products: unifiedProducts
        });

    } catch (error: any) {
        console.error("Alibaba Image Search Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}

