import {
    UnifiedSupplier,
    UnifiedProduct,
    PlatformType,
    SearchInput,
} from "@/lib/platforms/types";
import { searchAlibabaText, searchAlibabaImage } from "@/lib/platforms/alibaba/service";
import { searchMicText, searchMicImage } from "@/lib/platforms/madeinchina/service";

/**
 * Execute unified search across multiple platforms and inputs
 * 
 * @param inputs List of search inputs (text or image)
 * @param platforms List of platforms to search on
 * @returns Aggregated list of UnifiedSupplier objects
 */
export async function searchUnified(
    inputs: SearchInput[],
    platforms: PlatformType[] = ['alibaba', 'madeinchina']
): Promise<UnifiedSupplier[]> {

    console.log(`Unified Service: Searching ${inputs.length} inputs on ${platforms.join(', ')}`);

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
                            // Case 1: Browser/API File object (Blob)
                            const blob = input.file;
                            if (platform === 'alibaba') {
                                const res = await searchAlibabaImage(blob);
                                results = res.unifiedProducts;
                            } else if (platform === 'madeinchina') {
                                const res = await searchMicImage(blob);
                                results = res.unifiedProducts;
                            }
                        } else if (input.type === 'image' && input.value && input.value.startsWith('data:')) {
                            // Case 2: Base64 string (from Agent tools)
                            // Convert base64 to Blob/Buffer for the services
                            // The services currently expect Blob (File) objects because they use FormData.
                            // We might need to polyfill/convert if running in Node environment (Agent) vs Edge/Browser.
                            // For now, assuming standard Fetch API Blob availability or Node Buffer.

                            const response = await fetch(input.value);
                            const blob = await response.blob();

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
    // We add a temporary _sourceInputId to help with grouping
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
    return groupProductsIntoSuppliers(allProductsWithSource);
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
            // We need to cast because we added _sourceInputId to the type temporarily in the array
            const { _sourceInputId, ...startProduct } = product;
            supplier.products.push(startProduct as UnifiedProduct);
        }

        // Track matched input ID
        if (supplier.matchedInputIds && !supplier.matchedInputIds.includes(product._sourceInputId)) {
            supplier.matchedInputIds.push(product._sourceInputId);
        }
    });

    return Array.from(supplierMap.values());
}
