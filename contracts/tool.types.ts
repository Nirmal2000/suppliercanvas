/**
 * Tool Contract Types
 *
 * Feature: 001-agent-search
 * Defines the schema and types for LangChain tools used by the agent
 */

import * as z from 'zod';
import { UnifiedSupplier } from '@/lib/platforms/types';

// ============================================================================
// Search Tool
// ============================================================================

/**
 * Search tool input schema (Zod)
 *
 * This schema is used by LangChain for:
 * - Input validation
 * - Type inference
 * - LLM function calling schema generation
 */
export const searchToolSchema = z.object({
  /**
   * List of search query strings
   *
   * Examples:
   * - ["white sofas", "leather chairs"]
   * - ["compressed furniture"]
   */
  queries: z
    .array(z.string())
    .min(1, 'At least one query is required')
    .describe('List of search query strings to execute.'),

  /**
   * Type of search to perform
   *
   * - 'products': Search for products/items
   * - 'suppliers': Search for suppliers/manufacturers
   */
  searchType: z
    .enum(['products', 'suppliers'])
    .default('products')
    .describe('Type of search to perform: products or suppliers.'),
});

/**
 * Search tool input type (inferred from Zod schema)
 *
 * TypeScript type extracted from the Zod schema for type safety
 */
export type SearchToolInput = z.infer<typeof searchToolSchema>;

/**
 * Search tool output structure
 *
 * Returned by the tool implementation and converted to a ToolMessage
 */
export interface SearchToolOutput {
  /**
   * The original queries that were executed
   */
  queries: string[];

  /**
   * The type of search that was performed
   */
  searchType: 'products' | 'suppliers';

  /**
   * Array of search results
   *
   * Each result is a UnifiedSupplier object containing:
   * - Product/supplier details
   * - Platform information (Alibaba, Made-in-China)
   * - Images, pricing, MOQ, etc.
   */
  results: UnifiedSupplier[];

  /**
   * Total number of results found
   *
   * Should equal results.length
   */
  count: number;
}

/**
 * Tool metadata
 *
 * Metadata provided to LangChain when registering the tool
 */
export const searchToolMetadata = {
  /**
   * Tool name (used in tool calls)
   *
   * Must be unique across all tools in the agent
   */
  name: 'search',

  /**
   * Tool description for the LLM
   *
   * This description helps the model decide when to use this tool.
   * Should be clear and concise.
   */
  description:
    'Searches for products or suppliers based on a list of text queries. ' +
    'Use this tool when the user asks to find products or suppliers. ' +
    'The tool accepts multiple keywords/phrases to search simultaneously.' +
    'The tool returns a list of matching results with details like pricing, images, and supplier information.',
} as const;

// ============================================================================
// Tool Call Types (from LangChain)
// ============================================================================

/**
 * Tool call structure within AIMessage
 *
 * When the agent decides to use a tool, it includes a tool_calls array
 * in the AIMessage with this structure
 */
export interface ToolCall {
  /**
   * Unique identifier for this tool call
   *
   * Used to match ToolMessage results back to the original call
   */
  id: string;

  /**
   * Name of the tool to call
   *
   * For search tool, this will be 'search'
   */
  name: string;

  /**
   * Tool input arguments
   *
   * For search tool, this conforms to SearchToolInput
   */
  args: Record<string, unknown>;
}

// ============================================================================
// prompt-kit Tool Component Types
// ============================================================================

/**
 * Tool part structure for prompt-kit <Tool> component
 *
 * Maps LangChain tool execution to UI representation
 */
export interface ToolPart {
  /**
   * Tool type/name (e.g., 'search')
   */
  type: string;

  /**
   * Current execution state
   *
   * - 'pending': Tool call initiated, not yet executing
   * - 'running': Tool currently executing
   * - 'completed': Tool finished successfully
   * - 'error': Tool execution failed
   */
  state: 'pending' | 'running' | 'completed' | 'error';

  /**
   * Tool input arguments
   *
   * For search tool: { query: string, searchType: 'products' | 'suppliers' }
   */
  input: Record<string, unknown>;

  /**
   * Tool output result
   *
   * For search tool: { query, searchType, results, count }
   * Only populated when state is 'completed'
   */
  output: Record<string, unknown>;

  /**
   * Tool call identifier
   *
   * Matches the id from ToolCall in AIMessage
   */
  toolCallId: string;

  /**
   * Error message if state is 'error'
   */
  errorText: string;
}

// ============================================================================
// Type Utilities
// ============================================================================

/**
 * Convert LangChain ToolCall to prompt-kit ToolPart
 *
 * @param toolCall - ToolCall from AIMessage
 * @returns ToolPart for rendering with <Tool> component
 */
export function toolCallToToolPart(toolCall: ToolCall): ToolPart {
  return {
    type: toolCall.name,
    state: 'pending',
    input: toolCall.args,
    output: {},
    toolCallId: toolCall.id,
    errorText: '',
  };
}

/**
 * Convert ToolMessage content to ToolPart output
 *
 * @param toolMessage - LangChain ToolMessage
 * @returns ToolPart with populated output field
 */
export function toolMessageToToolPart(
  toolMessage: { content: string; tool_call_id: string; name: string }
): Partial<ToolPart> {
  try {
    const output = JSON.parse(toolMessage.content);
    return {
      type: toolMessage.name,
      state: 'completed',
      output,
      toolCallId: toolMessage.tool_call_id,
    };
  } catch (error) {
    return {
      type: toolMessage.name,
      state: 'error',
      errorText: 'Failed to parse tool output',
      toolCallId: toolMessage.tool_call_id,
    };
  }
}

/**
 * Type guard: Check if tool output is SearchToolOutput
 */
export function isSearchToolOutput(
  output: unknown
): output is SearchToolOutput {
  return (
    typeof output === 'object' &&
    output !== null &&
    'query' in output &&
    'results' in output &&
    'count' in output &&
    Array.isArray((output as any).results)
  );
}

// ============================================================================
// Example Usage
// ============================================================================

/**
 * Example: Defining the search tool
 *
 * ```typescript
 * import { tool } from 'langchain';
 * import { searchToolSchema, searchToolMetadata } from './tool.types';
 * import { searchUnified } from '@/lib/search/search-service';
 *
 * export const searchTool = tool(
 *   async ({ query, searchType }) => {
 *     const results = await searchUnified(
 *       [{ id: crypto.randomUUID(), type: 'text', value: query }],
 *       ['alibaba', 'madeinchina']
 *     );
 *
 *     return {
 *       query,
 *       searchType,
 *       results: results.results,
 *       count: results.results.length,
 *     };
 *   },
 *   {
 *     name: searchToolMetadata.name,
 *     description: searchToolMetadata.description,
 *     schema: searchToolSchema,
 *   }
 * );
 * ```
 */

/**
 * Example: Rendering a tool call in the UI
 *
 * ```tsx
 * import { Tool } from '@/components/prompt-kit/tool';
 * import { toolCallToToolPart } from './tool.types';
 *
 * function ToolRenderer({ toolCall }: { toolCall: ToolCall }) {
 *   const toolPart = toolCallToToolPart(toolCall);
 *
 *   return <Tool toolPart={toolPart} defaultOpen={false} />;
 * }
 * ```
 */
