import { tool } from '@langchain/core/tools';
import { searchToolSchema, searchToolMetadata, SearchToolOutput } from '@/contracts/tool.types';
import { searchUnified } from '@/lib/search/unified-service';
import { PlatformType, SearchInput } from '@/lib/platforms/types';


export const searchTool = tool(
    async ({ queries, searchType }, config) => {
        try {
            console.log(`[Agent] Searching for queries: ${queries.join(', ')} (Type: ${searchType})`);

            // Extract attachments from config
            const attachments = (config.configurable?.attachments as string[] | undefined) || [];
            console.log(`[Agent] Found ${attachments.length} attachments in context`);

            const inputs: SearchInput[] = [];

            // Add text queries
            queries.forEach(q => {
                inputs.push({
                    id: `text-${Date.now()}-${Math.random()}`,
                    type: 'text',
                    value: q
                });
            });

            // Add image attachments
            attachments.forEach((base64Image, index) => {
                inputs.push({
                    id: `image-${Date.now()}-${index}`,
                    type: 'image',
                    value: base64Image // Encoded base64 string
                });
            });

            if (inputs.length === 0) {
                return ["No search inputs provided.", { queries, searchType, results: [], count: 0 }];
            }

            // Execute unified search
            const unifiedResults = await searchUnified(inputs, ['alibaba', 'madeinchina']);
            const count = unifiedResults.length;

            // Create output object matching contract
            const output: SearchToolOutput = {
                queries,
                searchType,
                results: unifiedResults, // Return ALL results in artifact
                count,
                inputs // <--- Return the actual inputs used (with IDs) to the client
            };

            // Enhanced Debug for User
            console.log(`[Agent Tool] Returning artifact with ${inputs.length} inputs and ${unifiedResults.length} results.`);
            inputs.forEach(i => console.log(`[Agent Tool Input] ID: ${i.id}, Type: ${i.type}, Value Length: ${i.value.length}`));

            // Minimal summary for the Agent/LLM
            const summary = `Found ${count} suppliers for queries "${queries.join(', ')}" and ${attachments.length} images. The results have been rendered in the main grid.`;

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

