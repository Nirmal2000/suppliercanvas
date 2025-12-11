
import { NextRequest, NextResponse } from "next/server";
import { searchMicText, searchMicImage } from "@/lib/platforms/madeinchina/service";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("query") || searchParams.get("keywords");
    const page = parsePositiveInteger(searchParams.get("page")) || 1;

    if (!query) {
        return NextResponse.json(
            { error: "Query parameter is required" },
            { status: 400 }
        );
    }

    try {
        const { unifiedProducts, totalCount, hasMore } = await searchMicText(query, page);

        return NextResponse.json({
            source: "made-in-china",
            query,
            count: unifiedProducts.length,
            page,
            hasMore,
            totalCount,
            results: unifiedProducts // MIC frontend expects 'results', not 'products' (based on legacy code)
        });

    } catch (error: any) {
        console.error("MIC API Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}

function parsePositiveInteger(value: string | null): number | null {
    if (!value) return null;
    const parsed = Number(value);
    if (Number.isNaN(parsed)) return null;
    return parsed > 0 ? parsed : null;
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

        const { unifiedProducts, hasMore } = await searchMicImage(file, page);

        return NextResponse.json({
            source: "made-in-china",
            query: "image-search",
            count: unifiedProducts.length,
            page,
            hasMore,
            results: unifiedProducts
        });
    } catch (error: any) {
        console.error("MIC Image Search Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
