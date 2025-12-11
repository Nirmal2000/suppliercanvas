/**
 * API Contract Types for Agent Chat Endpoint
 *
 * Feature: 001-agent-search
 * Route: POST /api/agent/chat
 */

// 1. Add proper typing for your messages
// 1. LangChain Serialized Message Format
export interface SerializedMessage {
  type: 'constructor' | 'human' | 'ai' | 'tool';
  id: string[];
  kwargs: {
    content: string;
    tool_calls?: any[];
    response_metadata?: any;
    [key: string]: any;
  };
  data?: any; // To support newer LangChain serialization or custom payloads
}

// Update your api.types.ts StreamEvent to support tool outputs
// Add this union type:
export type StreamEventData =
  | { messages: SerializedMessage[] }  // Model chunks
  | { output: any };                   // Tool results

// ============================================================================
// Request Types
// ============================================================================

/**
 * Request body for POST /api/agent/chat
 *
 * Contains the full conversation history including user and assistant messages.
 * Messages must be serialized LangChain message objects.
 */
export interface ChatRequest {
  /**
   * Array of LangChain messages representing the conversation history.
   * Must include at least one HumanMessage.
   *
   * Example:
   * [
   *   { type: 'human', content: 'Find white sofas' },
   *   { type: 'ai', content: 'Let me search for that.', tool_calls: [...] }
   * ]
   */
  messages: SerializedMessage[];
}



// ============================================================================
// Response Types
// ============================================================================

/**
 * Streaming response format: Newline-Delimited JSON (NDJSON)
 *
 * Each line in the response is a JSON-encoded StreamEvent followed by '\n'.
 * Client should parse line-by-line using a ReadableStream reader.
 *
 * Content-Type: text/plain; charset=utf-8
 * Transfer-Encoding: chunked
 */
export type StreamingResponse = ReadableStream<Uint8Array>;

/**
 * Individual event in the stream
 *
 * Each event represents a step in the agent execution:
 * - 'model': LLM generation (may include tool calls)
 * - 'tools': Tool execution results
 */
export interface StreamEvent {
  /**
   * Type of agent node that produced this event
   * - 'model': Language model generation step
   * - 'tools': Tool execution step
   */
  type: 'model' | 'tools';

  /**
   * Event payload containing LangChain messages
   */
  data: StreamEventData;

  /**
   * Unix timestamp (milliseconds) when this event was emitted
   */
  timestamp: number;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error response structure
 *
 * Returned when the request fails or agent execution encounters an error.
 */
export interface ChatErrorResponse {
  /**
   * Error message describing what went wrong
   */
  error: string;

  /**
   * Optional error code for programmatic handling
   */
  code?: string;

  /**
   * Optional additional error details
   */
  details?: Record<string, unknown>;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if a stream event is a model event
 */
export function isModelEvent(event: StreamEvent): boolean {
  return event.type === 'model';
}

/**
 * Type guard to check if a stream event is a tools event
 */
export function isToolsEvent(event: StreamEvent): boolean {
  return event.type === 'tools';
}

/**
 * Type guard to check if response is an error
 */
export function isErrorResponse(
  response: unknown
): response is ChatErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'error' in response
  );
}

// ============================================================================
// Example Usage
// ============================================================================

/**
 * Example: Sending a chat request
 *
 * ```typescript
 * import { HumanMessage } from '@langchain/core/messages';
 *
 * const request: ChatRequest = {
 *   messages: [
 *     new HumanMessage("Find white sofas").toJSON()
 *   ]
 * };
 *
 * const response = await fetch('/api/agent/chat', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify(request)
 * });
 * ```
 */

/**
 * Example: Consuming the stream response
 *
 * ```typescript
 * const reader = response.body!.getReader();
 * const decoder = new TextDecoder();
 * let buffer = '';
 *
 * while (true) {
 *   const { done, value } = await reader.read();
 *   if (done) break;
 *
 *   buffer += decoder.decode(value, { stream: true });
 *   const lines = buffer.split('\n');
 *   buffer = lines.pop() || '';
 *
 *   for (const line of lines) {
 *     if (!line.trim()) continue;
 *
 *     const event: StreamEvent = JSON.parse(line);
 *
 *     if (isModelEvent(event)) {
 *       // Handle model generation
 *     } else if (isToolsEvent(event)) {
 *       // Handle tool execution results
 *     }
 *   }
 * }
 * ```
 */
