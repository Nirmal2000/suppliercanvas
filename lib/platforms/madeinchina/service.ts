
import { createProxyAgent } from "@/lib/proxy";
import { mapMicToUnifiedProduct } from "@/lib/platforms/madeinchina/product-mapper";
import { UnifiedProduct } from "@/lib/platforms/types";
import * as cheerio from "cheerio";
import sharp from "sharp";

export interface MicSearchResponse {
    unifiedProducts: UnifiedProduct[];
    totalCount: number | undefined;
    hasMore: boolean;
}

export async function searchMicText(query: string, page: number = 1): Promise<MicSearchResponse> {

    // Check for empty query
    if (!query || !query.trim()) {
        return { unifiedProducts: [], totalCount: 0, hasMore: false };
    }

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
        throw new Error(`Made-in-China responded with status ${response.status}`);
    }

    const html = await response.text();
    const results = parseMicSearchResults(html);

    const totalCount = extractTotalCount(html);
    const hasMore = calculateHasMore(totalCount, page, results.length);

    return {
        unifiedProducts: results.map(mapMicToUnifiedProduct),
        totalCount,
        hasMore
    };
}

export async function searchMicImage(file: Blob, page: number = 1): Promise<MicSearchResponse> {
    const originalBuffer = Buffer.from(await file.arrayBuffer());

    // Process image with Sharp
    const image = sharp(originalBuffer);

    // Convert to JPEG with 80% quality
    const processedBuffer = await image
        .jpeg({ quality: 80 })
        .toBuffer();

    const processedImage = sharp(processedBuffer);
    const processedMetadata = await processedImage.metadata();

    const width = processedMetadata.width?.toString() || "800";
    const height = processedMetadata.height?.toString() || "800";
    const size = processedBuffer.length.toString();
    const orgSize = originalBuffer.length.toString();

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

    const hasMore = calculateHasMore(undefined, page, finalResults.length);

    return {
        unifiedProducts: finalResults.map(mapMicToUnifiedProduct),
        totalCount: undefined,
        hasMore
    };
}


// --- Helper Functions ---

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

        // Images - Extract all available images
        const images: string[] = [];
        const $imgs = $el.find(".img-wrap img");

        $imgs.each((_, img) => {
            const $img = $(img);
            let imageUrl = $img.attr("data-original") || $img.attr("src") || "";

            // Clean up placeholder if data-original was missing
            if (imageUrl.includes("space.png") && $img.attr("data-original")) {
                imageUrl = $img.attr("data-original") || "";
            }

            if (imageUrl && !imageUrl.startsWith("http")) {
                if (imageUrl.startsWith("//")) {
                    imageUrl = "https:" + imageUrl;
                }
            }

            if (imageUrl && !images.includes(imageUrl)) {
                images.push(imageUrl);
            }
        });

        // Fallback if no images found via loop (e.g. single image not in standard list)
        if (images.length === 0) {
            const $img = $el.find(".img-wrap img").first();
            let imageUrl = $img.attr("data-original") || $img.attr("src") || "";
            if (imageUrl.includes("space.png") && $img.attr("data-original")) imageUrl = $img.attr("data-original") || "";
            if (imageUrl) {
                if (imageUrl.startsWith("//")) imageUrl = "https:" + imageUrl;
                images.push(imageUrl);
            }
        }

        const imageUrl = images[0] || "";

        // Price
        const price = $el.find(".price").text().trim();

        // MOQ
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
        if (authBlock.includes("Audited Supplier")) badges.push("Audited Supplier");
        if ($el.find(".icon-deal").length > 0 || authBlock.includes("Secured Trading")) {
            badges.push("Secured Trading");
        }

        if (title && productUrl) {
            results.push({
                title,
                productUrl,
                imageUrl,
                images,
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

        // Images - Extract all available
        const images: string[] = [];
        // Look for main image and thumbnails
        const $imgs = $el.find(".prod-img img, .img-thumb-inner img");

        $imgs.each((_, img) => {
            const $img = $(img);
            let imageUrl = $img.attr("data-original") || $img.attr("src") || "";

            if (imageUrl.includes("space.png") && $img.attr("data-original")) {
                imageUrl = $img.attr("data-original") || "";
            }

            if (imageUrl && !imageUrl.startsWith("http")) {
                if (imageUrl.startsWith("//")) {
                    imageUrl = "https:" + imageUrl;
                }
            }

            if (imageUrl && !images.includes(imageUrl)) {
                images.push(imageUrl);
            }
        });

        // Fallback
        if (images.length === 0) {
            const $img = $el.find(".prod-img .img-thumb-inner img").first();
            let imageUrl = $img.attr("data-original") || $img.attr("src") || "";
            if (imageUrl) {
                if (imageUrl.startsWith("//")) imageUrl = "https:" + imageUrl;
                images.push(imageUrl);
            }
        }

        const imageUrl = images[0] || "";

        // Price
        const price = $el.find(".price").text().trim();

        // MOQ
        let moq = "";
        $el.find(".attr-item").each((_, item) => {
            const text = $(item).text();
            if (text.includes("Min. Order")) {
                moq = $(item).find(".attribute strong").text().trim();
            }
        });

        // Company Info
        const $company = $el.find(".company-name .compnay-name");
        const companyName = $company.find("span").attr("title") || $company.text().trim();
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
        if ($authList.find(".tip-diamond").length > 0) badges.push("Diamond Member");


        if (title && productUrl) {
            results.push({
                title,
                productUrl,
                imageUrl,
                images,
                price,
                moq,
                companyName: companyName.replace(/[\n\r\t]/g, "").trim(),
                companyUrl,
                location: "",
                attributes,
                badges
            });
        }
    });

    return results;
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
    const PAGE_SIZE = 36;
    if (typeof totalCount === 'number') {
        return page * PAGE_SIZE < totalCount;
    }
    return currentCount >= PAGE_SIZE;
}
