
import { NextRequest, NextResponse } from "next/server";
import { createProxyAgent } from "@/lib/proxy";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query') || searchParams.get('keywords');

    if (!query) {
        return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    try {
        const encodedQuery = encodeURIComponent(query);
        const url = `https://www.alibaba.com/hzmagellanviptbsitenet/trade/search?spm=a2700.galleryofferlist.leftFilter.d_filter.53c413a0tQ8bYG&fsb=y&IndexArea=product_en&assessmentCompany=true&has4Tab=true&keywords=${encodedQuery}&originKeywords=${encodedQuery}&tab=all`;

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

        // Regex to extract the window.__page__data_sse10 content
        // Looking for: window.__page__data_sse10 = { ... };
        // Using [\s\S] instead of dot with 's' flag for broader compatibility
        const regex = /window\.__page__data_sse10\s*=\s*(\{[\s\S]*?\});/;
        const match = html.match(regex);

        if (!match || !match[1]) {
            console.error("Could not find window.__page__data_sse10 in HTML");
            return NextResponse.json({ error: 'Failed to extract data from vendor' }, { status: 502 });
        }

        const jsonString = match[1];

        try {
            const data = JSON.parse(jsonString);

            // Navigate to the target path: _offer_list.offerResultData.offers[0].productList
            const offerList = data._offer_list;
            if (!offerList) throw new Error("Missing _offer_list");

            const offerResultData = offerList.offerResultData;
            if (!offerResultData) throw new Error("Missing offerResultData");

            const offers = offerResultData.offers;
            if (!offers || !Array.isArray(offers) || offers.length === 0) throw new Error("Missing offers");

            const productList = offers[0].productList;

            if (!productList) {
                return NextResponse.json({ products: [] });
            }

            return NextResponse.json({ products: productList });

        } catch (parseError) {
            console.error("Error parsing JSON data:", parseError);
            return NextResponse.json({ error: 'Failed to parse vendor data' }, { status: 502 });
        }

    } catch (error: any) {
        console.error("API Error:", error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
