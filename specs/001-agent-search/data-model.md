# Data Model: Agent-Powered Search Integration

**Feature**: 001-agent-search
**Date**: 2025-12-11
**Status**: Complete

## Overview

This document defines all data entities using **LangChain's native message format universally** throughout the stack - no conversions, single source of truth.

---

## Core Principle

**Use LangChain message types everywhere**: Store, API, UI components all use the same LangChain message format. No custom ChatMessage type, no conversions.

---

## Entity Definitions

### 1. Message Types (LangChain Native)

From `@langchain/core/messages`:

```typescript
import { HumanMessage, AIMessage, ToolMessage } from '@langchain/core/messages';

// User messages
class HumanMessage {
  content: string;
  additional_kwargs?: Record<string, unknown>;
  id?: string;
}

// Assistant messages (may include tool calls)
class AIMessage {
  content: string;
  tool_calls?: ToolCall[];
  additional_kwargs?: Record<string, unknown>;
  id?: string;
}

// Tool execution results
class ToolMessage {
  content: string;              // JSON stringified tool output
  tool_call_id: string;
  name: string;                 // Tool name
  additional_kwargs?: Record<string, unknown>;
  id?: string;
}

// Tool call structure within AIMessage
interface ToolCall {
  id: string;                   // Unique tool call ID
  name: string;                 // Tool name (e.g., "search")
  args: Record<string, unknown>; // Tool input parameters
}
```

**These are used everywhere**:
- Zustand store: `messages: BaseMessage[]`
- API requests: Send LangChain messages
- API responses: Stream LangChain message chunks
- UI components: Render LangChain messages directly

**Validation Rules**:
- `content`: Non-empty string for HumanMessage
- `content`: Can be empty for AIMessage if tool_calls present
- `tool_calls`: Optional array, each with unique id
- `tool_call_id`: Must match a tool call ID from previous AIMessage

**State Transitions**:
```
User input → HumanMessage
           ↓
Agent processes → AIMessage (may have tool_calls)
           ↓
If tool_calls → Execute tools → ToolMessage for each
           ↓
Agent continues → Final AIMessage with content
```

---

### 2. Search Query

Simple object for tracking search parameters.

```typescript
interface SearchQuery {
  query: string;
  searchType: 'products' | 'suppliers';
  source: 'manual' | 'agent';
}
```

**Validation Rules**:
- `query`: Non-empty string, max 500 characters
- `searchType`: Must be 'products' or 'suppliers'
- `source`: 'manual' for user-initiated, 'agent' for tool-initiated

---

### 3. Search Results (Existing Type - Reused)

```typescript
// From @/lib/platforms/types
interface UnifiedSupplier {
  id: string;
  platform: 'alibaba' | 'madeinchina';
  name: string;
  price: number | null;
  currency: string;
  moq: number | null;
  images: string[];
  products: UnifiedProduct[];
  supplier: {
    id: string;
    name: string;
    location?: string;
    verification: string[];
    url?: string;
  };
  url?: string;
  platformSpecific: Record<string, unknown>;
  matchedInputIds?: string[];
}
```

**No changes** - existing type reused as-is.

---

### 4. Shared State (Zustand Store)

```typescript
import { BaseMessage } from '@langchain/core/messages';
import { UnifiedSupplier, SearchInput } from '@/lib/platforms/types';

interface SharedSearchState {
  // Search state
  searchQuery: string;
  searchInputs: SearchInput[];
  searchResults: UnifiedSupplier[];
  isSearching: boolean;

  // Chat state - LangChain messages directly
  messages: BaseMessage[];      // HumanMessage | AIMessage | ToolMessage
  isAgentResponding: boolean;

  // Actions
  setSearchQuery: (query: string) => void;
  setSearchInputs: (inputs: SearchInput[]) => void;
  setSearchResults: (results: UnifiedSupplier[]) => void;
  setIsSearching: (loading: boolean) => void;
  addMessage: (message: BaseMessage) => void;
  updateLastMessage: (updater: (msg: BaseMessage) => BaseMessage) => void;
  clearChat: () => void;
}
```

**Key Points**:
- `messages`: Array of LangChain BaseMessage objects (no custom format)
- `addMessage`: Add any LangChain message type
- `updateLastMessage`: For streaming updates to AIMessage content

---

## Tool Schema

### Search Tool Definition

```typescript
import { tool } from "langchain";
import * as z from "zod";

export const searchTool = tool(
  async ({ query, searchType }) => {
    // Execute search using existing service
    const results = await searchUnified(
      [{ id: crypto.randomUUID(), type: 'text', value: query }],
      ['alibaba', 'madeinchina']
    );

    // Return structured output
    return {
      query,
      searchType,
      results: results.results,
      count: results.results.length,
    };
  },
  {
    name: "search",
    description: "Searches for products or suppliers based on a text query.",
    schema: z.object({
      query: z
        .string()
        .min(1)
        .max(500)
        .describe("Free-form search query text."),

      searchType: z
        .enum(['products', 'suppliers'])
        .default('products')
        .describe("Type of search: products or suppliers."),
    }),
  }
);

// Tool input type (inferred from Zod schema)
type SearchToolInput = z.infer<typeof searchTool.schema>;

// Tool output type
interface SearchToolOutput {
  query: string;
  searchType: 'products' | 'suppliers';
  results: UnifiedSupplier[];
  count: number;
}
```

**Tool Execution Flow**:
1. Agent decides to call search tool
2. AIMessage created with `tool_calls: [{ id, name: 'search', args: {...} }]`
3. Tool executes → Returns SearchToolOutput
4. ToolMessage created with `content: JSON.stringify(output)`, `tool_call_id`, `name: 'search'`
5. Agent receives ToolMessage and generates final response

---

## API Contract

### POST /api/agent/chat

**Request Body**:
```typescript
interface ChatRequest {
  messages: BaseMessage[];      // LangChain messages (serialized)
}
```

**Response**: Streaming NDJSON

Each line is a JSON object representing a LangChain stream event:

```typescript
interface StreamEvent {
  type: 'model' | 'tools';
  data: {
    messages: BaseMessage[];    // Array of LangChain messages
  };
  timestamp: number;
}
```

**Stream Event Types**:

1. **Model Event** (`type: 'model'`):
   - Contains AIMessage with content and/or tool_calls
   - Indicates LLM generation step

2. **Tools Event** (`type: 'tools'`):
   - Contains ToolMessage array with tool execution results
   - Each ToolMessage has tool output in `content` field (JSON string)

**Example Stream**:
```
{"type":"model","data":{"messages":[{"type":"ai","content":"Let me search for that.","tool_calls":[{"id":"call_123","name":"search","args":{"query":"white sofas","searchType":"products"}}]}]},"timestamp":1702...}
{"type":"tools","data":{"messages":[{"type":"tool","content":"{\"query\":\"white sofas\",\"results\":[...],\"count\":25}","tool_call_id":"call_123","name":"search"}]},"timestamp":1702...}
{"type":"model","data":{"messages":[{"type":"ai","content":"I found 25 white sofas for you."}]},"timestamp":1702...}
```

---

## Data Flow

### Complete Flow with LangChain Messages

```
1. User types: "Find white sofas"
   → Create HumanMessage("Find white sofas")
   → Add to Zustand: messages.push(humanMsg)

2. POST /api/agent/chat { messages: [...messages, humanMsg] }

3. Agent streams:

   Event 1: {"type":"model","data":{"messages":[AIMessage with tool_calls]}}
   → Add to Zustand: messages.push(aiMsgWithToolCalls)

   Event 2: {"type":"tools","data":{"messages":[ToolMessage with results]}}
   → Add to Zustand: messages.push(toolMsg)
   → Parse toolMsg.content → Update searchResults state

   Event 3: {"type":"model","data":{"messages":[AIMessage final response]}}
   → Add to Zustand: messages.push(finalAiMsg)

4. UI renders messages array:
   - HumanMessage → UserBubble component
   - AIMessage (with tool_calls) → AssistantBubble + ToolCard
   - ToolMessage → ToolResultCard (show input/output)
   - AIMessage (final) → AssistantBubble
```

---

## UI Component Mapping

### Rendering LangChain Messages

```typescript
// components/agent/message-renderer.tsx
import { BaseMessage } from '@langchain/core/messages';
import { Message, MessageAvatar, MessageContent } from '@/components/prompt-kit/message';
import { Tool } from '@/components/prompt-kit/tool';

function MessageRenderer({ message }: { message: BaseMessage }) {
  // Human message
  if (message._getType() === 'human') {
    return (
      <Message>
        <MessageAvatar fallback="U" />
        <MessageContent>{message.content}</MessageContent>
      </Message>
    );
  }

  // AI message
  if (message._getType() === 'ai') {
    const aiMsg = message as AIMessage;

    return (
      <>
        <Message>
          <MessageAvatar fallback="AI" />
          <MessageContent markdown>{aiMsg.content}</MessageContent>
        </Message>

        {/* Render tool calls if present */}
        {aiMsg.tool_calls?.map(tc => (
          <Tool
            key={tc.id}
            toolPart={{
              type: tc.name,
              state: 'pending',
              input: tc.args,
              output: {},
              toolCallId: tc.id,
              errorText: '',
            }}
          />
        ))}
      </>
    );
  }

  // Tool message
  if (message._getType() === 'tool') {
    const toolMsg = message as ToolMessage;
    const output = JSON.parse(toolMsg.content);

    return (
      <Tool
        toolPart={{
          type: toolMsg.name,
          state: 'completed',
          input: {},
          output,
          toolCallId: toolMsg.tool_call_id,
          errorText: '',
        }}
      />
    );
  }

  return null;
}
```

---

## Serialization

LangChain messages are classes, so serialize/deserialize when storing or transmitting:

```typescript
import { mapStoredMessageToChatMessage } from '@langchain/core/messages';

// Before sending to API
const serialized = messages.map(msg => msg.toJSON());

// After receiving from API
const deserialized = serialized.map(msgData =>
  mapStoredMessageToChatMessage(msgData)
);
```

---

## Validation Summary

| Entity | Required Fields | Max Sizes | Enum Values |
|--------|----------------|-----------|-------------|
| HumanMessage | content | content: 10,000 chars | - |
| AIMessage | content OR tool_calls | content: unlimited | - |
| ToolMessage | content, tool_call_id, name | - | - |
| SearchToolInput | query, searchType | query: 500 chars | searchType: products\|suppliers |
| SearchQuery | query, searchType, source | query: 500 chars | searchType: products\|suppliers; source: manual\|agent |

---

## State Persistence

**Client-Side Only** (No Database):
- All state in Zustand (in-memory)
- LangChain messages stored as-is in `messages` array
- Lost on page reload

**Future localStorage sync**:
```typescript
// Serialize messages before storing
localStorage.setItem('chat', JSON.stringify(messages.map(m => m.toJSON())));

// Deserialize on load
const stored = JSON.parse(localStorage.getItem('chat') || '[]');
const messages = stored.map(mapStoredMessageToChatMessage);
```

---

## Summary

**Single Format Everywhere**:
- ✅ Zustand store: `BaseMessage[]`
- ✅ API requests: LangChain messages
- ✅ API responses: LangChain messages
- ✅ UI components: Render LangChain messages
- ✅ Tool system: LangChain ToolMessage
- ❌ No custom ChatMessage type
- ❌ No conversions

**Benefits**:
- Zero conversion overhead
- Type safety through entire stack
- Direct compatibility with LangChain ecosystem
- Simpler codebase
- Tool calls natively supported

---

## Next Steps

1. Generate API contracts (TypeScript type exports)
2. Generate quickstart developer guide
