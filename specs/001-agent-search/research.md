# Research: Agent-Powered Search Integration

**Feature**: 001-agent-search
**Date**: 2025-12-11
**Status**: Complete

## Overview

This document consolidates research findings for all technical decisions required to implement the agent-powered search integration feature. Research resolved three NEEDS CLARIFICATION items from the Technical Context.

---

## Decision 1: AI/LLM Integration Library

### Decision: **LangChain JS**

### Rationale

LangChain JS is the chosen library based on existing project documentation (docs/chatdoc.md) and architectural requirements:

1. **Agent-Based Architecture**
   - Native support for agents with tool calling loops
   - `createAgent()` provides production-ready agent implementation
   - Built-in iteration limits and safety controls (`maxIterations`)
   - Matches the multi-step agent workflow required (FR-007, FR-008)

2. **Tool Execution Framework**
   - Structured tool definitions using Zod schemas
   - Type-safe tool calling with input validation
   - Tool results automatically fed back to model
   - Perfect for search tool integration (FR-004, FR-005, FR-006)

3. **Streaming Support**
   - Agent streaming with `streamMode: ["updates", "messages"]`
   - Step-level updates (model → tools → model)
   - Token-by-token message streaming
   - Progressive display of intermediate steps

4. **TypeScript Excellence**
   - First-class TypeScript support
   - Zod schema integration for type safety
   - Full type inference for tools and messages

5. **Established in Project**
   - Already documented in project (docs/chatdoc.md)
   - Clear patterns for implementation
   - Integrates with prompt-kit UI components

### Implementation Pattern

Based on docs/chatdoc.md:

```typescript
// lib/agent/tools.ts
import { tool } from "langchain";
import * as z from "zod";
import { searchUnified } from "@/lib/search/search-service";

export const searchTool = tool(
  async ({ query, searchType }) => {
    const platforms = ['alibaba', 'madeinchina'];
    const results = await searchUnified(
      [{ id: crypto.randomUUID(), type: 'text', value: query }],
      platforms
    );

    return {
      query,
      searchType,
      results: results.results,
      count: results.results.length
    };
  },
  {
    name: "search",
    description: "Searches for products or suppliers based on a text query.",
    schema: z.object({
      query: z.string().describe("Free-form search query text."),
      searchType: z
        .enum(['products', 'suppliers'])
        .default('products')
        .describe("Type of search to perform."),
    }),
  }
);
```

```typescript
// app/api/agent/chat/route.ts
import { NextRequest } from 'next/server';
import { createAgent } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { searchTool } from "@/lib/agent/tools";

export async function POST(request: NextRequest) {
  const { messages } = await request.json();

  const model = new ChatOpenAI({
    model: "gpt-4.1-mini",
    temperature: 0.3,
    streaming: true,
  });

  const agent = createAgent({
    model,
    tools: [searchTool],
    maxIterations: 6,
  });

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const streamIterator = await agent.stream(
          { messages },
          { streamMode: ["updates", "messages"] }
        );

        for await (const chunk of streamIterator) {
          const [nodeName, nodeState] = Object.entries(chunk)[0];

          const event = {
            type: nodeName,
            data: nodeState,
            timestamp: Date.now()
          };

          controller.enqueue(
            encoder.encode(JSON.stringify(event) + '\n')
          );
        }

        controller.close();
      } catch (error) {
        controller.error(error);
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
    },
  });
}
```

### Dependencies to Install

```bash
npm install langchain @langchain/openai @langchain/core zod
```

### Bundle Impact

- LangChain core: ~200-300KB gzipped (includes agent runtime)
- Acceptable for the feature requirements
- Tree-shakeable - only imports used modules

---

## Decision 2: State Management Solution

### Decision: **Zustand**

### Rationale

Zustand is the optimal choice for sharing state between the main search pane and chat sidebar:

1. **Perfect Fit for Use Case**
   - Minimal complexity for 3 simple state slices: search results, search query, chat messages
   - Client-side only, ephemeral state - exactly the requirement
   - No persistence overhead

2. **Next.js 15 + RSC Compatibility**
   - Works seamlessly with `'use client'` directive
   - Zero RSC conflicts (plain JavaScript modules)
   - SSR-friendly without hydration issues

3. **TypeScript Excellence**
   - First-class TypeScript support with full type inference
   - Type-safe selectors with auto-completion
   - Minimal type overhead

4. **Performance**
   - Bundle size: **~1.2KB gzipped**
   - Built-in selector-based subscriptions prevent unnecessary re-renders
   - Natural upgrade from existing `useState` patterns

5. **Learning Curve**
   - Minimal - if you know `useState`, you know Zustand
   - Can coexist with existing `useState` (no need to refactor)

### Implementation Pattern

```typescript
// lib/agent/state.ts
import { create } from 'zustand';
import { UnifiedSupplier, SearchInput } from '@/lib/platforms/types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'tool';
  content: string;
  timestamp: number;
}

interface SearchState {
  searchQuery: string;
  searchInputs: SearchInput[];
  searchResults: UnifiedSupplier[];
  isSearching: boolean;
  chatMessages: ChatMessage[];
  isAgentResponding: boolean;

  setSearchQuery: (query: string) => void;
  setSearchInputs: (inputs: SearchInput[]) => void;
  setSearchResults: (results: UnifiedSupplier[]) => void;
  setIsSearching: (loading: boolean) => void;
  addChatMessage: (message: ChatMessage) => void;
  clearChat: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  searchQuery: '',
  searchInputs: [],
  searchResults: [],
  isSearching: false,
  chatMessages: [],
  isAgentResponding: false,

  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchInputs: (inputs) => set({ searchInputs: inputs }),
  setSearchResults: (results) => set({ searchResults: results }),
  setIsSearching: (loading) => set({ isSearching: loading }),
  addChatMessage: (message) => set((state) => ({
    chatMessages: [...state.chatMessages, message]
  })),
  clearChat: () => set({ chatMessages: [] }),
}));
```

```typescript
// Usage in components
'use client';
import { useSearchStore } from '@/lib/agent/state';

// Use fine-grained selectors to prevent unnecessary re-renders
const searchResults = useSearchStore((state) => state.searchResults);
const setSearchResults = useSearchStore((state) => state.setSearchResults);
```

### Dependencies to Install

```bash
npm install zustand
```

---

## Decision 3: Streaming Protocol

### Decision: **ReadableStream with Response (Web Streams API)**

### Rationale

ReadableStream with the Web Streams API is the optimal streaming protocol:

1. **Native Next.js 15 Support**
   - First-class support for streaming responses in API routes
   - Seamless integration with existing API route structure
   - No additional server infrastructure needed

2. **Perfect Match for LangChain**
   - LangChain's `.stream()` returns async iterators
   - Direct mapping to ReadableStream
   - Pattern documented in chatdoc.md

3. **Multi-Step Streaming** (FR-007)
   - Stream each agent step as separate chunks
   - Client processes chunks progressively
   - Display tool execution states (pending → running → completed)
   - Show token-by-token text streaming

4. **Browser Compatibility**
   - Universal support across modern browsers
   - No fallback mechanisms needed
   - Works identically in dev and production

5. **Lower Complexity**
   - No WebSocket server infrastructure
   - No complex SSE event parsing
   - Simple error handling and connection recovery

### Implementation Pattern

As documented in chatdoc.md, LangChain streaming maps to ReadableStream:

```typescript
const streamIterator = await agent.stream(input, {
  streamMode: ["updates", "messages"]
});

const stream = new ReadableStream({
  async start(controller) {
    for await (const chunk of streamIterator) {
      controller.enqueue(encoder.encode(JSON.stringify(chunk) + '\n'));
    }
    controller.close();
  }
});
```

Client-side consumption using `fetch().body.getReader()`:

```typescript
const response = await fetch('/api/agent/chat', {
  method: 'POST',
  body: JSON.stringify({ messages }),
});

const reader = response.body!.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  // Process NDJSON chunks
}
```

### Protocol Format

**Newline-Delimited JSON (NDJSON)**:
- Each chunk is a complete JSON object followed by `\n`
- Easy to parse incrementally on client
- No complex SSE event syntax

---

## Decision 4: UI Components

### Decision: **prompt-kit**

### Rationale

prompt-kit is the chosen UI component library based on existing project documentation (docs/chatdoc.md):

1. **Built on shadcn/ui**
   - Consistent with existing Radix UI components
   - Tailwind CSS based
   - Customizable and accessible

2. **Chat-Specific Components**
   - ChatContainer with smart auto-scroll
   - Message components with markdown support
   - Tool component for tool execution display
   - PromptInput for chat input
   - Loader/ThinkingBar for loading states

3. **Maps to LangChain Events**
   - Tool component matches LangChain tool invocation structure
   - State handling (pending/running/completed/error)
   - Tool input/output display

4. **Already Documented**
   - Installation patterns in chatdoc.md
   - Component API reference available
   - Clear usage examples

### Installation Pattern

```bash
npx shadcn add "https://prompt-kit.com/c/chat-container.json"
npx shadcn add "https://prompt-kit.com/c/message.json"
npx shadcn add "https://prompt-kit.com/c/tool.json"
npx shadcn add "https://prompt-kit.com/c/prompt-input.json"
npx shadcn add "https://prompt-kit.com/c/thinking-bar.json"
```

### Implementation Pattern

From chatdoc.md:

```tsx
import {
  ChatContainerRoot,
  ChatContainerContent,
  ChatContainerScrollAnchor,
} from "@/components/prompt-kit/chat-container";
import { Message, MessageAvatar, MessageContent } from "@/components/prompt-kit/message";
import { Tool } from "@/components/prompt-kit/tool";
import { PromptInput, PromptInputTextarea } from "@/components/prompt-kit/prompt-input";

function ChatSidebar() {
  return (
    <div className="flex flex-col h-full">
      <ChatContainerRoot className="flex-1">
        <ChatContainerContent>
          {messages.map(msg => (
            <Message key={msg.id}>
              <MessageAvatar fallback={msg.role === 'user' ? 'U' : 'AI'} />
              <MessageContent markdown>{msg.content}</MessageContent>
            </Message>
          ))}
          {toolCalls.map(tool => (
            <Tool key={tool.toolCallId} toolPart={tool} />
          ))}
        </ChatContainerContent>
        <ChatContainerScrollAnchor />
      </ChatContainerRoot>

      <PromptInput value={input} onValueChange={setInput} onSubmit={handleSubmit}>
        <PromptInputTextarea placeholder="Ask something..." />
      </PromptInput>
    </div>
  );
}
```

---

## Summary of Technical Decisions

| Category | Decision | Bundle Impact | Implementation Time |
|----------|----------|---------------|---------------------|
| AI/LLM Library | LangChain JS | ~200-300KB | 3-5 days |
| State Management | Zustand | ~1.2KB | 1-2 hours |
| Streaming Protocol | ReadableStream (Web Streams) | 0KB (native) | Included in LangChain |
| UI Components | prompt-kit | ~10-15KB | 2-3 hours setup |

**Total Bundle Impact**: ~220-320KB gzipped
**Total Implementation Time**: 3-5 days (P1-P3 user stories)

---

## Architecture Overview

```
User Input
    ↓
PromptInput (prompt-kit)
    ↓
POST /api/agent/chat
    ↓
LangChain Agent (createAgent)
    ├─→ ChatOpenAI Model (streaming: true)
    └─→ Search Tool (searchUnified)
         ↓
    Agent.stream() → ReadableStream
         ↓
    NDJSON chunks {"type": "model"|"tools", "data": {...}}
         ↓
Client fetch + getReader()
         ↓
    ├─→ Update Zustand Store (searchResults, chatMessages)
    ├─→ Render Message Components (prompt-kit)
    └─→ Render Tool Components (prompt-kit)
         ↓
Display in ChatContainer + Main Search Grid
```

---

## Next Steps

Proceed to Phase 1: Design & Contracts
1. Generate data-model.md (entity schemas)
2. Generate API contracts (TypeScript interfaces)
3. Generate quickstart.md (developer guide)
4. Update agent context with new technologies
