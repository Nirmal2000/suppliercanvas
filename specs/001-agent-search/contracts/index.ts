/**
 * Contract Types Index
 *
 * Feature: 001-agent-search
 * Re-exports all contract types for convenient importing
 */

// API Types
export type {
  ChatRequest,
  SerializedMessage,
  StreamingResponse,
  StreamEvent,
  ChatErrorResponse,
} from './api.types';

export {
  isModelEvent,
  isToolsEvent,
  isErrorResponse,
} from './api.types';

// Tool Types
export type {
  SearchToolInput,
  SearchToolOutput,
  ToolCall,
  ToolPart,
} from './tool.types';

export {
  searchToolSchema,
  searchToolMetadata,
  toolCallToToolPart,
  toolMessageToToolPart,
  isSearchToolOutput,
} from './tool.types';

// State Types
export type {
  SharedSearchState,
  StateSelector,
  StoreCreator,
} from './state.types';

export { selectors } from './state.types';
