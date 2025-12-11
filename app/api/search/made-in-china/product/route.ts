
import { NextRequest, NextResponse } from "next/server";
import { mapMicToUnifiedProduct } from "@/lib/platforms/madeinchina/product-mapper";
import * as cheerio from "cheerio";
import { createProxyAgent } from "@/lib/proxy";


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
        const formattedQuery = encodeURIComponent(query.trim().replace(/\s+/g, "+"));
        const url = `https://www.made-in-china.com/multi-search/${formattedQuery}/F1/${page}.html`;

        const agent = createProxyAgent();
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
            // @ts-expect-error - agent is supported in Node.js fetch
            agent,
        });

        if (!response.ok) {
            console.error(`Failed to fetch page ${page}: ${response.status}`);
            throw new Error(`Made-in-China responded with status ${response.status}`);
        }

        const html = await response.text();
        const results = parseMicSearchResults(html);

        // Try to estimate hasMore based on result count (assuming standard page size)
        // Standard page size for MIC search is usually 36 or 60 items depending on view, but let's assume if we got full page of results there might be more.
        // Actually, let's try to extract total count if possible, similar to supplier search.
        const totalCount = extractTotalCount(html); // Helper to be added
        const hasMore = calculateHasMore(totalCount, page, results.length);

        return NextResponse.json({
            source: "made-in-china",
            query,
            count: results.length,
            page,
            hasMore,
            totalCount,
            results: results.map(mapMicToUnifiedProduct)
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

function extractTotalCount(html: string): number | undefined {
    const $ = cheerio.load(html);
    const totalAttribute =
        $('[data-total]').first().attr('data-total') ??
        $('[data-result-total]').first().attr('data-result-total') ??
        $('[data-result-count]').first().attr('data-result-count');

    if (totalAttribute) {
        const normalized = Number(totalAttribute.replace(/,/g, ''));
        if (!Number.isNaN(normalized)) {
            return normalized;
        }
    }

    const totalText = $('.company-total, .result-number').first().text();
    if (totalText) {
        const digits = totalText.replace(/[^0-9]/g, '');
        if (digits) {
            return Number(digits);
        }
    }
    return undefined;
}

function calculateHasMore(totalCount: number | undefined, page: number, currentCount: number): boolean {
    const PAGE_SIZE = 36; // Approx page size for MIC product search
    if (typeof totalCount === 'number') {
        return page * PAGE_SIZE < totalCount;
    }
    return currentCount >= PAGE_SIZE; // Simple fallback
}

import sharp from "sharp";

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

        const originalBuffer = Buffer.from(await file.arrayBuffer());

        // Process image with Sharp:
        // 1. Convert to JPEG (standardize format)
        // 2. Resize if too large (optional, but good for performance) - MIC script does 80% quality
        // 3. Get dimensions
        const image = sharp(originalBuffer);
        const metadata = await image.metadata();

        // Convert to JPEG with 80% quality like the script
        const processedBuffer = await image
            .jpeg({ quality: 80 })
            .toBuffer();

        // Get dimensions from metadata (or processed buffer metadata if needed, but original dimensions usually ok for 'orgwidth')
        // Actually script sends dimensions of the FILE it sends.
        // Let's get metadata of the processed buffer to be sure.
        const processedImage = sharp(processedBuffer);
        const processedMetadata = await processedImage.metadata();

        const width = processedMetadata.width?.toString() || "800";
        const height = processedMetadata.height?.toString() || "800";
        const size = processedBuffer.length.toString();
        const orgSize = originalBuffer.length.toString();


        const searchParams = request.nextUrl.searchParams;
        const page = parsePositiveInteger(searchParams.get("page")) || 1;

        // ... (Image processing code remains similar, but we need to ensure we can just use the upload response for p1 or p2)
        // Actually, for page 2 we need the imageId which comes from the upload response URL.
        // So we ALWAYS upload.

        const uploadForm = new FormData();
        const blob = new Blob([new Uint8Array(processedBuffer)], { type: "image/jpeg" });
        uploadForm.append("multipartFile", blob, "image.jpg");
        uploadForm.append("orgwidth", width);
        uploadForm.append("orgheight", height);
        uploadForm.append("zipsize", size);
        uploadForm.append("orgsize", orgSize);

        const agent = createProxyAgent();
        const uploadRes = await fetch("https://file.made-in-china.com/img-search/upload", {
            method: "POST",
            headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Origin": "https://www.made-in-china.com",
                "Referer": "https://www.made-in-china.com/"
            },
            body: uploadForm,
            // @ts-expect-error - agent is supported in Node.js fetch
            agent,
        });

        if (!uploadRes.ok) {
            throw new Error(`Failed to upload image to MIC: ${uploadRes.status}`);
        }

        const uploadData = await uploadRes.json();
        if (!uploadData?.data?.url) {
            console.error("MIC Upload Response:", uploadData);
            throw new Error("Invalid response from MIC image upload");
        }

        const resultUrl = uploadData.data.url;
        let finalResults: any[] = [];

        if (page === 1) {
            // Fetch the result page (Page 1)
            const resultRes = await fetch(resultUrl, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                },
                // @ts-expect-error - agent is supported in Node.js fetch
                agent,
            });

            if (!resultRes.ok) {
                throw new Error(`Failed to fetch result page: ${resultRes.status}`);
            }

            const html = await resultRes.text();
            finalResults = parseMicImageSearchResults(html);
        } else {
            // Fetch Page > 1
            // Extract Image ID from URL
            const urlParts = resultUrl.split("/");
            const filename = urlParts[urlParts.length - 1];
            const imageId = filename.replace(".html", "");

            if (imageId) {
                const pageUrl = `https://www.made-in-china.com/img-search/ajax/${imageId}?leafCode=&colorCode=&page=${page}`;
                const pageRes = await fetch(pageUrl, {
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                        "X-Requested-With": "XMLHttpRequest"
                    },
                    // @ts-expect-error - agent is supported in Node.js fetch
                    agent,
                });

                if (pageRes.ok) {
                    const pageHtml = await pageRes.text();
                    finalResults = parseMicImageSearchResults(pageHtml);
                } else {
                    console.warn(`Failed to fetch page ${page}: ${pageRes.status}`);
                }
            }
        }

        // MIC results don't easily give us total count in image search AJAX or HTML without deeper parsing (layout is simple).
        // Best guess for hasMore: if we got results, assume maybe more unless very few.
        // Actually, if we get < 60 (typical max), likely end.
        const hasMore = calculateHasMore(undefined, page, finalResults.length);


        return NextResponse.json({
            source: "made-in-china",
            query: "image-search",
            count: finalResults.length,
            page,
            hasMore,
            results: finalResults.map(mapMicToUnifiedProduct)
        });
    } catch (error: any) {
        console.error("MIC Image Search Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}


function parseMicSearchResults(html: string): any[] {
    const $ = cheerio.load(html);
    const results: any[] = [];

    $(".list-node").each((_, element) => {
        const $el = $(element);

        // Product Name and URL
        const $title = $el.find(".product-name a");
        const title = $title.text().trim();
        let productUrl = $title.attr("href") || "";
        // Ensure absolute URL
        if (productUrl && !productUrl.startsWith("http")) {
            productUrl = "https:" + productUrl;
        }

        // Image
        // Priority: data-original (lazy load), then src
        const $img = $el.find(".img-wrap img").first();
        let imageUrl = $img.attr("data-original") || $img.attr("src") || "";
        // Clean up placeholder if data-original was missing (sometimes src is a spacer)
        if (imageUrl.includes("space.png") && $img.attr("data-original")) {
            imageUrl = $img.attr("data-original") || "";
        }
        if (imageUrl && !imageUrl.startsWith("http")) {
            if (imageUrl.startsWith("//")) {
                imageUrl = "https:" + imageUrl;
            }
        }

        // Price
        const price = $el.find(".price").text().trim();

        // MOQ
        // The .info div contains MOQ text like "1 Piece(MOQ)" or just "1 Piece"
        // We want to verify it's the one next to price-info or contains "MOQ"
        let moq = "";
        $el.find(".info").each((_, infoEl) => {
            const text = $(infoEl).text().trim();
            if (text.includes("MOQ") || (!text.includes("US$") && !$(infoEl).hasClass("price-info"))) {
                moq = text.replace("(MOQ)", "").trim();
            }
        });

        // Company Info
        const $company = $el.find(".company-name-txt .compnay-name");
        const companyName = $company.text().trim();
        let companyUrl = $company.attr("href") || "";
        if (companyUrl && !companyUrl.startsWith("http")) {
            if (companyUrl.startsWith("//")) {
                companyUrl = "https:" + companyUrl;
            }
        }

        // Location
        const location = $el.find(".company-address-info .tip-address .tip-para").text().trim();

        // Attributes
        const attributes: Record<string, string> = {};
        $el.find(".property-list li").each((_, propEl) => {
            const text = $(propEl).text().trim();
            // Format: "Style: Modern"
            const parts = text.split(":");
            if (parts.length >= 2) {
                const key = parts[0].trim();
                const value = parts.slice(1).join(":").trim();
                if (key && value) {
                    attributes[key] = value;
                }
            }
        });

        // Badges
        const badges: string[] = [];
        const authBlock = $el.find(".auth-block-list").text();
        if (authBlock.includes("Diamond Member")) badges.push("Diamond Member");
        if (authBlock.includes("Gold Member")) badges.push("Gold Member");
        if (authBlock.includes("Audited Supplier")) badges.push("Audited Supplier"); // Check explicit text
        // Also check for specific icons/classes if text isn't enough, but text is usually reliable here
        if ($el.find(".icon-deal").length > 0 || authBlock.includes("Secured Trading")) {
            badges.push("Secured Trading");
        }

        if (title && productUrl) {
            results.push({
                title,
                productUrl,
                imageUrl,
                price,
                moq,
                companyName,
                companyUrl,
                location,
                attributes,
                badges
            });
        }
    });

    return results;
}

function parseMicImageSearchResults(html: string): any[] {
    const $ = cheerio.load(html);
    const results: any[] = [];

    $(".products-item").each((_, element) => {
        const $el = $(element);

        // Product Name and URL
        const $title = $el.find(".product-name a");
        const title = $title.text().trim();
        let productUrl = $title.attr("href") || "";
        if (productUrl && !productUrl.startsWith("http")) {
            productUrl = "https:" + productUrl;
        }

        // Image
        // Use the first displayed image or data-original if lazy loaded
        const $img = $el.find(".prod-img .img-thumb-inner img").first();
        let imageUrl = $img.attr("data-original") || $img.attr("src") || "";
        if (imageUrl.includes("space.png") && $img.attr("data-original")) {
            imageUrl = $img.attr("data-original") || "";
        }
        if (imageUrl && !imageUrl.startsWith("http")) {
            if (imageUrl.startsWith("//")) {
                imageUrl = "https:" + imageUrl;
            }
        }

        // Price
        // Structure: <strong class="price">US$ 190-445</strong>
        const price = $el.find(".price").text().trim();

        // MOQ
        // Structure: <div class="ellipsis attr-item ...">Min. Order:<span class="attribute"><strong>1 Piece</strong></span></div>
        let moq = "";
        $el.find(".attr-item").each((_, item) => {
            const text = $(item).text();
            if (text.includes("Min. Order")) {
                moq = $(item).find(".attribute strong").text().trim();
            }
        });

        // Company Info
        const $company = $el.find(".company-name .compnay-name");
        const companyName = $company.find("span").attr("title") || $company.text().trim(); // Sometimes name is in title attribute or text
        let companyUrl = $company.attr("href") || "";
        if (companyUrl && !companyUrl.startsWith("http")) {
            if (companyUrl.startsWith("//")) {
                companyUrl = "https:" + companyUrl;
            }
        }

        // Attributes (Hidden area)
        const attributes: Record<string, string> = {};
        $el.find(".hide-area .prop-item").each((_, propEl) => {
            const key = $(propEl).find(".prop-lab").text().replace(":", "").trim();
            const value = $(propEl).find(".prop-val").text().trim();
            if (key && value) {
                attributes[key] = value;
            }
        });

        // Badges
        const badges: string[] = [];
        const $authList = $el.find(".auth-list");
        if ($authList.find(".tip-gold").length > 0) badges.push("Gold Member");
        if ($authList.find(".tip-as").length > 0) badges.push("Audited Supplier");
        // Check for Diamond if applicable (not seen in sample but good to have)
        if ($authList.find(".tip-diamond").length > 0) badges.push("Diamond Member");


        if (title && productUrl) {
            results.push({
                title,
                productUrl,
                imageUrl,
                price,
                moq,
                companyName: companyName.replace(/[\n\r\t]/g, "").trim(), // clean up
                companyUrl,
                location: "", // Location not prominent in this view?
                attributes,
                badges
            });
        }
    });

    return results;
}
