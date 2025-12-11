
import { NextRequest, NextResponse } from "next/server";
import { createProxyAgent } from "@/lib/proxy";
import { mapAlibabaToUnifiedProduct } from "@/lib/platforms/alibaba/product-mapper";


export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query') || searchParams.get('keywords');
    const page = parsePositiveInteger(searchParams.get('page')) || 1;

    if (!query) {
        return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    try {
        const encodedQuery = encodeURIComponent(query);
        const url = `https://www.alibaba.com/hzmagellanviptbsitenet/trade/search?spm=a2700.galleryofferlist.leftFilter.d_filter.53c413a0tQ8bYG&fsb=y&IndexArea=product_en&assessmentCompany=true&has4Tab=true&keywords=${encodedQuery}&originKeywords=${encodedQuery}&tab=all&page=${page}`;

        const agent = createProxyAgent();
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            // @ts-expect-error - agent is supported in Node.js fetch
            agent,
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch Alibaba search results: ${response.status} ${response.statusText}`);
        }

        const html = await response.text();
        // Regex to extract the window.__page__data_sse10._offer_list content
        // Looking for: window.__page__data_sse10._offer_list = { ... };
        const regex = /window\.__page__data_sse10\._offer_list\s*=\s*({[\s\S]*?})(?=\s*<\/script>)/;

        const match = html.match(regex);

        if (!match || !match[1]) {
            console.error("Could not find window.__page__data_sse10._offer_list in HTML");
            return NextResponse.json({ error: 'Failed to extract data from vendor' }, { status: 502 });
        }

        const jsonString = match[1];
        try {
            const offerList = JSON.parse(jsonString);
            // Navigate to the target path: offerResultData.offers[0].productList
            // Note: We need to handle potential missing paths safely.
            if (!offerList) throw new Error("Missing _offer_list data");

            const offerResultData = offerList.offerResultData;
            if (!offerResultData) throw new Error("Missing offerResultData");

            const offers = offerResultData.offers;
            if (!offers || !Array.isArray(offers) || offers.length === 0) {
                // Return empty result if no offers found (could be end of pagination)
                return NextResponse.json({
                    source: "alibaba",
                    query,
                    count: 0,
                    page,
                    hasMore: false,
                    products: []
                });
            }

            const unifiedProducts = offers.map((offer: any) => mapAlibabaToUnifiedProduct(offer));

            // Estimate hasMore efficiently. 
            // Alibaba usually returns total count in the data but let's look for it if easy.
            // offerResultData usually has 'totalCount'.
            const totalCount = offerResultData.totalCount ? Number(offerResultData.totalCount) : undefined;
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

        } catch (parseError) {
            console.error("Error parsing JSON data:", parseError);
            return NextResponse.json({ error: 'Failed to parse vendor data' }, { status: 502 });
        }

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
    const PAGE_SIZE = 40; // Approx page size for Alibaba
    if (typeof totalCount === 'number') {
        return page * PAGE_SIZE < totalCount;
    }
    return currentCount >= PAGE_SIZE;
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("image") as File;

        if (!file) {
            return NextResponse.json(
                { error: "Image file is required" },
                { status: 400 }
            );
        }


        const searchParams = request.nextUrl.searchParams;
        const page = parsePositiveInteger(searchParams.get("page")) || 1;

        // ... (Image processing and upload code remains same as it needs to happen)

        const buffer = Buffer.from(await file.arrayBuffer());
        const base64Data = buffer.toString("base64");
        const mimeType = file.type || "image/jpeg";
        const pictureBase = `data:${mimeType};base64,${base64Data}`;

        const uploadUrl = "https://www.alibaba.com/search/api/imageTextSearchRegions";
        const uploadForm = new FormData();
        uploadForm.append("pictureBase", pictureBase);

        const agent = createProxyAgent();
        const uploadRes = await fetch(uploadUrl, {
            method: "POST",
            headers: {
                "accept": "*/*",
                "origin": "https://www.alibaba.com",
                "referer": "https://www.alibaba.com/",
                "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            },
            body: uploadForm,
            // @ts-expect-error - agent is supported in Node.js fetch
            agent,
        });

        if (!uploadRes.ok) {
            throw new Error(`Failed to upload image to Alibaba: ${uploadRes.status}`);
        }

        const uploadData = await uploadRes.json();

        if (!uploadData?.success || !uploadData?.model?.imagePath) {
            console.error("Alibaba Upload Response:", uploadData);
            throw new Error("Invalid response from Alibaba image upload");
        }

        const { imagePath, regions } = uploadData.model;
        const selectedRegions = regions && regions.length > 0 ? regions.slice(0, 4) : regions || [];
        const regionsJson = JSON.stringify(selectedRegions);

        const params = new URLSearchParams({
            tab: "all",
            SearchScene: "imageTextSearch",
            imagePath: imagePath,
            regions: regionsJson,
            from: "pcHomeContent",
            page: page.toString()
        });

        const baseUrl = "https://www.alibaba.com/search/api/imageTextSearch";
        const searchUrl = `${baseUrl}?${params.toString()}`;
        console.log("Alibaba Search URL:", searchUrl);

        let finalOffers: any[] = [];

        try {
            const searchRes = await fetch(searchUrl, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                },
                // @ts-expect-error - agent is supported in Node.js fetch
                agent,
            });

            if (!searchRes.ok) {
                console.error(`Failed to fetch Alibaba page ${page}: ${searchRes.status}`);
                throw new Error(`Alibaba search failed: ${searchRes.status}`);
            }

            const responseData = await searchRes.json();

            if (responseData?.model?.offers) {
                finalOffers = responseData.model.offers;
            } else if (responseData?.model?.offerResultData?.offers) {
                finalOffers = responseData.model.offerResultData.offers;
            } else if (responseData?.data?.offers) {
                finalOffers = responseData.data.offers;
            }

        } catch (err) {
            console.error(`Error fetching/parsing Alibaba page ${page}:`, err);
            // Return empty if failed
        }

        const unifiedProducts = finalOffers.map((offer: any) => mapAlibabaToUnifiedProduct(offer));
        const hasMore = calculateHasMore(undefined, page, unifiedProducts.length);

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
