
import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { createProxyAgent } from "@/lib/proxy";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("query") || searchParams.get("keywords");

    if (!query) {
        return NextResponse.json(
            { error: "Query parameter is required" },
            { status: 400 }
        );
    }

    try {
        // Format query to match MIC URL structure: spaces -> '+' then encoded
        // e.g., "compressed sofa" -> "compressed+sofa" -> "compressed%2Bsofa"
        const formattedQuery = encodeURIComponent(query.trim().replace(/\s+/g, "+"));

        // We want to fetch 2 pages: 1 and 2
        const pages = [1, 2];
        const results: any[] = [];

        await Promise.all(
            pages.map(async (page) => {
                const url = `https://www.made-in-china.com/multi-search/${formattedQuery}/F1/${page}.html`;

                try {
                    const agent = createProxyAgent();
                    const response = await fetch(url, {
                        headers: {
                            "User-Agent":
                                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                        },
                        // @ts-expect-error - agent is supported in Node.js fetch
                        agent,
                    });

                    if (!response.ok) {
                        console.error(`Failed to fetch page ${page}: ${response.status}`);
                        return;
                    }

                    const html = await response.text();
                    const $ = cheerio.load(html);

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

                } catch (pageError) {
                    console.error(`Error fetching page ${page}:`, pageError);
                }
            })
        );

        return NextResponse.json({
            source: "made-in-china",
            query,
            count: results.length,
            results
        });

    } catch (error: any) {
        console.error("MIC API Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
