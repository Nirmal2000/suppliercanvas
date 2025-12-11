
import { NextRequest, NextResponse } from "next/server";
import {
    UnifiedSupplier,
    UnifiedProduct,
    PlatformType,
    SearchInput,
    SearchInputType,
    AggregatedSearchResult
} from "@/lib/platforms/types";
import { searchAlibabaText, searchAlibabaImage } from "@/lib/platforms/alibaba/service";
import { searchMicText, searchMicImage } from "@/lib/platforms/madeinchina/service";

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();

        // Parse Inputs
        const inputs: SearchInput[] = [];

        // Text Queries
        const queriesJson = formData.get("queries") as string;
        if (queriesJson) {
            try {
                const parsedQueries = JSON.parse(queriesJson);
                if (Array.isArray(parsedQueries)) {
                    parsedQueries.forEach((q: { id: string, value: string }) => {
                        inputs.push({
                            id: q.id,
                            type: 'text',
                            value: q.value
                        });
                    });
                }
            } catch (e) {
                console.error("Failed to parse queries", e);
            }
        }

        // Image Files
        // Files are appended with key "files"
        const files = formData.getAll("files");
        // We need to map files to input IDs. 
        // Generically we assume strict ordering or we pass metadata.
        // Let's assume the client sends a separate "image_inputs" metadata field to map filenames/indices to IDs.
        // Or simpler: Client sends "file_{id}" as key for each file? 
        // Let's iterate all keys and look for "file_*" prefix.

        for (const key of formData.keys()) {
            if (key.startsWith("file_")) {
                const id = key.replace("file_", "");
                const file = formData.get(key) as File;
                if (file) {
                    inputs.push({
                        id,
                        type: 'image',
                        value: file.name,
                        file // We have the file object here to pass to service
                    });
                }
            }
        }

        // Platforms
        let platforms: PlatformType[] = ['alibaba', 'madeinchina'];
        const platformsJson = formData.get("platforms") as string;
        if (platformsJson) {
            try {
                platforms = JSON.parse(platformsJson);
            } catch (e) {
                // fallback
            }
        }

        console.log(`Unified Search: ${inputs.length} inputs on ${platforms.join(', ')}`);

        // Create tasks
        const tasks: Promise<{ inputId: string, platform: PlatformType, products: UnifiedProduct[] }>[] = [];

        for (const input of inputs) {
            for (const platform of platforms) {
                tasks.push(
                    (async () => {
                        try {
                            let results: UnifiedProduct[] = [];
                            if (input.type === 'text') {
                                if (platform === 'alibaba') {
                                    const res = await searchAlibabaText(input.value);
                                    results = res.unifiedProducts;
                                } else if (platform === 'madeinchina') {
                                    const res = await searchMicText(input.value);
                                    results = res.unifiedProducts;
                                }
                            } else if (input.type === 'image' && input.file) {
                                // We need to convert File to Blob for the service functions
                                const blob = input.file;
                                if (platform === 'alibaba') {
                                    const res = await searchAlibabaImage(blob);
                                    results = res.unifiedProducts;
                                } else if (platform === 'madeinchina') {
                                    const res = await searchMicImage(blob);
                                    results = res.unifiedProducts;
                                }
                            }
                            return { inputId: input.id, platform, products: results };
                        } catch (error) {
                            console.error(`Search failed for input ${input.id} on ${platform}`, error);
                            return { inputId: input.id, platform, products: [] };
                        }
                    })()
                );
            }
        }

        const taskResults = await Promise.all(tasks);

        // Aggregate Results
        const allProductsWithSource: (UnifiedProduct & { _sourceInputId: string })[] = [];

        taskResults.forEach(taskRes => {
            taskRes.products.forEach(p => {
                allProductsWithSource.push({
                    ...p,
                    _sourceInputId: taskRes.inputId
                });
            });
        });

        // Group into Suppliers
        const mergedSuppliers = groupProductsIntoSuppliers(allProductsWithSource);

        const response: AggregatedSearchResult = {
            inputs: inputs.map(i => ({ id: i.id, type: i.type, value: i.value })), // Exclude file object
            results: mergedSuppliers,
            timestamp: Date.now()
        };

        return NextResponse.json(response);

    } catch (error: any) {
        console.error("Unified API Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}


function groupProductsIntoSuppliers(products: (UnifiedProduct & { _sourceInputId: string })[]): UnifiedSupplier[] {
    const supplierMap = new Map<string, UnifiedSupplier>();

    products.forEach(product => {
        // Create a unique key for the supplier
        const supplierName = product.supplier.name || 'Unknown Supplier';
        const supplierKey = `${product.platform}-${product.supplier.id || supplierName}`;

        if (!supplierMap.has(supplierKey)) {
            supplierMap.set(supplierKey, {
                id: product.supplier.id || `sup-${Date.now()}-${Math.random()}`,
                platform: product.platform,
                name: supplierName,
                price: null,
                currency: product.currency,
                moq: null,
                images: [],
                products: [],
                supplier: {
                    id: product.supplier.id || '',
                    name: supplierName,
                    location: product.supplier.location,
                    verification: product.supplier.badges || [],
                    url: product.supplier.url
                },
                url: product.supplier.url,
                platformSpecific: {},
                matchedInputIds: []
            });
        }

        const supplier = supplierMap.get(supplierKey)!;

        // Add product if not already present (dedup by ID)
        if (!supplier.products.some(p => p.id === product.id)) {
            // Remove the internal _sourceInputId property when adding to supplier list
            const { _sourceInputId, ...startProduct } = product;
            supplier.products.push(startProduct);
        }

        // Track matched input ID
        if (supplier.matchedInputIds && !supplier.matchedInputIds.includes(product._sourceInputId)) {
            supplier.matchedInputIds.push(product._sourceInputId);
        }
    });

    return Array.from(supplierMap.values());
}
