import { tool } from '@langchain/core/tools';
import { searchToolSchema, searchToolMetadata, SearchToolOutput } from '@/contracts/tool.types';
import { searchAlibabaText } from '@/lib/platforms/alibaba/service';
import { searchMicText } from '@/lib/platforms/madeinchina/service';
import { UnifiedProduct, UnifiedSupplier } from '@/lib/platforms/types';

export const searchTool = tool(
    async ({ query, searchType }) => {
        try {
            console.log(`[Agent] Searching for "${query}" (Type: ${searchType})`);

            // Execute searches in parallel
            const [alibabaRes, micRes] = await Promise.allSettled([
                searchAlibabaText(query),
                searchMicText(query)
            ]);

            let allProducts: UnifiedProduct[] = [];

            if (alibabaRes.status === 'fulfilled') {
                allProducts = [...allProducts, ...alibabaRes.value.unifiedProducts];
            } else {
                console.error('[Agent] Alibaba search failed:', alibabaRes.reason);
            }

            if (micRes.status === 'fulfilled') {
                allProducts = [...allProducts, ...micRes.value.unifiedProducts];
            } else {
                console.error('[Agent] MIC search failed:', micRes.reason);
            }

            // Group products into suppliers (Simplified logic matching Unified API)
            const supplierMap = new Map<string, UnifiedSupplier>();

            allProducts.forEach(product => {
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
                        matchedInputIds: [] // Not applicable for single string query
                    });
                }

                const supplier = supplierMap.get(supplierKey)!;
                // Dedup products
                if (!supplier.products.some(p => p.id === product.id)) {
                    supplier.products.push(product);
                }
            });

            const unifiedResults = Array.from(supplierMap.values());
            const count = unifiedResults.length;

            // Create output object matching contract
            const output: SearchToolOutput = {
                query,
                searchType,
                results: unifiedResults, // Return ALL results in artifact
                count
            };

            // Minimal summary for the Agent/LLM
            const summary = `Found ${count} suppliers for "${query}". The results have been rendered in the main grid.`;

            // Return content and artifact
            // The content goes to the LLM. The artifact goes to the client state.
            return [summary, output];

        } catch (error: any) {
            console.error('[Agent] Tool execution failed:', error);
            return ["Search failed: " + (error.message || "Unknown error"), { error: error.message }];
        }
    },
    {
        name: searchToolMetadata.name,
        description: searchToolMetadata.description,
        schema: searchToolSchema,
        responseFormat: "content_and_artifact"
    }
);
