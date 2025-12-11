/**
 * State Management Types (Zustand Store)
 *
 * Feature: 001-agent-search
 * Defines the shared state structure for the agent-powered search interface
 */

import { BaseMessage } from '@langchain/core/messages';
import { UnifiedSupplier, SearchInput } from '@/lib/platforms/types';

// ============================================================================
// Shared Search State
// ============================================================================

/**
 * Global state managed by Zustand
 *
 * Shared between:
 * - Main search pane (displays search results)
 * - Chat sidebar (agent conversation)
 *
 * State is client-side only and not persisted (lost on page reload)
 */
export interface SharedSearchState {
  // ─────────────────────────────────────────────────────────────────────────
  // Search State
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Current search query text
   *
   * Updated when:
   * - User manually enters a search query
   * - Agent executes a search tool
   */
  searchQuery: string;

  /**
   * Current search inputs (text/image)
   *
   * For the multi-input search bar interface
   */
  searchInputs: SearchInput[];

  /**
   * Current search results displayed in the main pane
   *
   * Updated when:
   * - User performs a manual search
   * - Agent executes a search tool
   *
   * This is the single source of truth for results shown in the main grid
   */
  searchResults: UnifiedSupplier[];

  /**
   * Search loading state
   *
   * True when a search is in progress (manual or agent-triggered)
   */
  isSearching: boolean;

  // ─────────────────────────────────────────────────────────────────────────
  // Chat State
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Chat conversation messages
   *
   * Array of LangChain messages (HumanMessage, AIMessage, ToolMessage)
   * Ordered chronologically (oldest first)
   *
   * No conversion needed - these are native LangChain message objects
   */
  messages: BaseMessage[];

  /**
   * Agent response loading state
   *
   * True when the agent is currently generating a response or executing tools
   */
  isAgentResponding: boolean;

  // ─────────────────────────────────────────────────────────────────────────
  // Actions (State Setters)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Update the current search query
   */
  setSearchQuery: (query: string) => void;

  /**
   * Update the search inputs array
   */
  setSearchInputs: (inputs: SearchInput[]) => void;

  /**
   * Update the search results
   *
   * Called when:
   * - Manual search completes
   * - Agent tool execution completes
   */
  setSearchResults: (results: UnifiedSupplier[]) => void;

  /**
   * Update the search loading state
   */
  setIsSearching: (loading: boolean) => void;

  /**
   * Add a message to the conversation
   *
   * @param message - LangChain message (HumanMessage, AIMessage, ToolMessage)
   */
  addMessage: (message: BaseMessage) => void;

  /**
   * Update the last message in the conversation
   *
   * Used for streaming updates to AIMessage content
   *
   * @param updater - Function that receives the current last message and returns updated message
   *
   * @example
   * // Append streaming tokens to AIMessage
   * updateLastMessage(msg => {
   *   return new AIMessage(msg.content + newTokens);
   * });
   */
  updateLastMessage: (updater: (msg: BaseMessage) => BaseMessage) => void;

  /**
   * Update agent responding state
   */
  setIsAgentResponding: (responding: boolean) => void;

  /**
   * Clear all chat messages
   *
   * Resets the conversation to empty state
   */
  clearChat: () => void;
}

// ============================================================================
// State Invariants (Business Rules)
// ============================================================================

/**
 * Invariants that must always be true:
 *
 * 1. When isSearching is true, a search operation is in progress
 *    - searchResults may be stale until search completes
 *
 * 2. When isAgentResponding is true:
 *    - The last message should be an AIMessage (role: 'ai')
 *    - User input should be disabled
 *
 * 3. searchResults always contains the most recent completed search
 *    - Whether initiated manually or by agent
 *    - Updated atomically when search completes
 *
 * 4. messages array is append-only during a session
 *    - New messages always added to end
 *    - Only cleared explicitly via clearChat()
 *
 * 5. Chat history is ephemeral (client-side only)
 *    - Lost on page reload
 *    - No persistence to database or localStorage
 */

// ============================================================================
// Selector Types
// ============================================================================

/**
 * Selector function type for Zustand
 *
 * Used to subscribe to specific slices of state
 *
 * @example
 * const searchResults = useSearchStore(state => state.searchResults);
 */
export type StateSelector<T> = (state: SharedSearchState) => T;

/**
 * Common selector patterns
 */
export const selectors = {
  /**
   * Select only search-related state
   */
  searchState: (state: SharedSearchState) => ({
    query: state.searchQuery,
    inputs: state.searchInputs,
    results: state.searchResults,
    isSearching: state.isSearching,
  }),

  /**
   * Select only chat-related state
   */
  chatState: (state: SharedSearchState) => ({
    messages: state.messages,
    isAgentResponding: state.isAgentResponding,
  }),

  /**
   * Select all loading states
   */
  loadingStates: (state: SharedSearchState) => ({
    isSearching: state.isSearching,
    isAgentResponding: state.isAgentResponding,
  }),
} as const;

// ============================================================================
// Store Creation Type
// ============================================================================

/**
 * Zustand store creation type
 *
 * @example
 * import { create } from 'zustand';
 *
 * export const useSearchStore = create<SharedSearchState>((set) => ({
 *   // Initial state
 *   searchQuery: '',
 *   searchInputs: [],
 *   searchResults: [],
 *   isSearching: false,
 *   messages: [],
 *   isAgentResponding: false,
 *
 *   // Actions
 *   setSearchQuery: (query) => set({ searchQuery: query }),
 *   setSearchResults: (results) => set({ searchResults: results }),
 *   addMessage: (message) => set((state) => ({
 *     messages: [...state.messages, message]
 *   })),
 *   // ... other actions
 * }));
 */
export type StoreCreator = (
  set: (partial: Partial<SharedSearchState>) => void,
  get: () => SharedSearchState
) => SharedSearchState;

// ============================================================================
// Example Usage
// ============================================================================

/**
 * Example: Creating the Zustand store
 *
 * ```typescript
 * // lib/agent/state.ts
 * import { create } from 'zustand';
 * import { SharedSearchState } from '@/contracts/state.types';
 *
 * export const useSearchStore = create<SharedSearchState>((set) => ({
 *   searchQuery: '',
 *   searchInputs: [],
 *   searchResults: [],
 *   isSearching: false,
 *   messages: [],
 *   isAgentResponding: false,
 *
 *   setSearchQuery: (query) => set({ searchQuery: query }),
 *   setSearchInputs: (inputs) => set({ searchInputs: inputs }),
 *   setSearchResults: (results) => set({ searchResults: results }),
 *   setIsSearching: (loading) => set({ isSearching: loading }),
 *   addMessage: (message) => set((state) => ({
 *     messages: [...state.messages, message]
 *   })),
 *   updateLastMessage: (updater) => set((state) => {
 *     const messages = [...state.messages];
 *     const lastMsg = messages[messages.length - 1];
 *     messages[messages.length - 1] = updater(lastMsg);
 *     return { messages };
 *   }),
 *   setIsAgentResponding: (responding) => set({ isAgentResponding: responding }),
 *   clearChat: () => set({ messages: [] }),
 * }));
 * ```
 */

/**
 * Example: Using selectors in components
 *
 * ```typescript
 * // components/agent/chat-sidebar.tsx
 * import { useSearchStore } from '@/lib/agent/state';
 * import { selectors } from '@/contracts/state.types';
 *
 * function ChatSidebar() {
 *   // Subscribe to only chat state (prevents re-renders on search state changes)
 *   const { messages, isAgentResponding } = useSearchStore(selectors.chatState);
 *
 *   // Or use fine-grained selectors
 *   const addMessage = useSearchStore((state) => state.addMessage);
 *
 *   // Component code...
 * }
 * ```
 */

/**
 * Example: Updating search results from agent tool
 *
 * ```typescript
 * // When agent search tool completes:
 * const setSearchResults = useSearchStore.getState().setSearchResults;
 * const setSearchQuery = useSearchStore.getState().setSearchQuery;
 *
 * // Parse ToolMessage content
 * const toolOutput: SearchToolOutput = JSON.parse(toolMessage.content);
 *
 * // Update shared state
 * setSearchQuery(toolOutput.query);
 * setSearchResults(toolOutput.results);
 *
 * // Now both main pane and chat sidebar reflect the same results
 * ```
 */
