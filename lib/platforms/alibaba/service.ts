
import { createProxyAgent } from "@/lib/proxy";
import { mapAlibabaToUnifiedProduct } from "@/lib/platforms/alibaba/product-mapper";
import { UnifiedProduct } from "@/lib/platforms/types";

export interface AlibabaSearchResponse {
    unifiedProducts: UnifiedProduct[];
    totalCount: number | undefined;
}

export async function searchAlibabaText(query: string, page: number = 1): Promise<AlibabaSearchResponse> {
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
    const regex = /window\.__page__data_sse10\._offer_list\s*=\s*({[\s\S]*?})(?=\s*<\/script>)/;

    const match = html.match(regex);

    if (!match || !match[1]) {
        console.error("Could not find window.__page__data_sse10._offer_list in HTML");
        throw new Error('Failed to extract data from vendor');
    }

    const jsonString = match[1];
    let offers: any[] = [];
    let totalCount: number | undefined;

    try {
        const offerList = JSON.parse(jsonString);
        if (!offerList) throw new Error("Missing _offer_list data");

        const offerResultData = offerList.offerResultData;
        if (!offerResultData) throw new Error("Missing offerResultData");

        offers = offerResultData.offers || [];
        totalCount = offerResultData.totalCount ? Number(offerResultData.totalCount) : undefined;
    } catch (parseError) {
        console.error("Error parsing JSON data:", parseError);
        throw new Error('Failed to parse vendor data');
    }

    const unifiedProducts = offers.map((offer: any) => mapAlibabaToUnifiedProduct(offer));

    return {
        unifiedProducts,
        totalCount
    };
}

export async function searchAlibabaImage(file: Blob, page: number = 1): Promise<AlibabaSearchResponse> {
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Data = buffer.toString("base64");
    const mimeType = file.type || "image/jpeg";

    // Note: Alibaba image upload requires base64 with data URI scheme
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

    let finalOffers: any[] = [];
    let totalCount: number | undefined;

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

        // Try to get count if available (often not in image search)
        if (responseData?.model?.totalCount || responseData?.data?.totalCount) {
            totalCount = Number(responseData?.model?.totalCount || responseData?.data?.totalCount);
        }

    } catch (err: any) {
        console.error(`Error fetching/parsing Alibaba page ${page}:`, err);
        throw new Error(err.message || "Failed to fetch image search results");
    }

    const unifiedProducts = finalOffers.map((offer: any) => mapAlibabaToUnifiedProduct(offer));

    return {
        unifiedProducts,
        totalCount
    };
}
