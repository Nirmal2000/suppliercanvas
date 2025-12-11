# Quickstart Guide: Agent-Powered Search Integration

**Feature**: 001-agent-search
**Date**: 2025-12-11

## Overview

This guide walks you through implementing the agent-powered search integration feature. Follow the steps in order to build the complete feature from scratch.

**Estimated Time**: 3-5 days
**Prerequisites**: Basic knowledge of Next.js 15, React 19, TypeScript, and LangChain

---

## Table of Contents

1. [Installation & Setup](#1-installation--setup)
2. [Phase 1: Zustand Store](#2-phase-1-zustand-store)
3. [Phase 2: Search Tool](#3-phase-2-search-tool)
4. [Phase 3: Agent API Route](#4-phase-3-agent-api-route)
5. [Phase 4: UI Components](#5-phase-4-ui-components)
6. [Phase 5: Main Page Integration](#6-phase-5-main-page-integration)
7. [Testing & Debugging](#7-testing--debugging)

---

## 1. Installation & Setup

### Install Dependencies

```bash
# Core dependencies
npm install langchain @langchain/openai @langchain/core zod zustand

# prompt-kit components
npx shadcn add "https://prompt-kit.com/c/chat-container.json"
npx shadcn add "https://prompt-kit.com/c/message.json"
npx shadcn add "https://prompt-kit.com/c/tool.json"
npx shadcn add "https://prompt-kit.com/c/prompt-input.json"
npx shadcn add "https://prompt-kit.com/c/thinking-bar.json"
```

### Environment Variables

Add your OpenAI API key to `.env.local`:

```bash
OPENAI_API_KEY=sk-...
```

---

## 2. Phase 1: Zustand Store

Create the shared state store that connects the main search pane and chat sidebar.

### Create `lib/agent/state.ts`

```typescript
import { create } from 'zustand';
import { BaseMessage } from '@langchain/core/messages';
import { UnifiedSupplier, SearchInput } from '@/lib/platforms/types';

interface SharedSearchState {
  // Search state
  searchQuery: string;
  searchInputs: SearchInput[];
  searchResults: UnifiedSupplier[];
  isSearching: boolean;

  // Chat state - LangChain messages directly
  messages: BaseMessage[];
  isAgentResponding: boolean;

  // Actions
  setSearchQuery: (query: string) => void;
  setSearchInputs: (inputs: SearchInput[]) => void;
  setSearchResults: (results: UnifiedSupplier[]) => void;
  setIsSearching: (loading: boolean) => void;
  addMessage: (message: BaseMessage) => void;
  updateLastMessage: (updater: (msg: BaseMessage) => BaseMessage) => void;
  setIsAgentResponding: (responding: boolean) => void;
  clearChat: () => void;
}

export const useSearchStore = create<SharedSearchState>((set) => ({
  // Initial state
  searchQuery: '',
  searchInputs: [],
  searchResults: [],
  isSearching: false,
  messages: [],
  isAgentResponding: false,

  // Actions
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchInputs: (inputs) => set({ searchInputs: inputs }),
  setSearchResults: (results) => set({ searchResults: results }),
  setIsSearching: (loading) => set({ isSearching: loading }),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  updateLastMessage: (updater) =>
    set((state) => {
      if (state.messages.length === 0) return state;

      const messages = [...state.messages];
      messages[messages.length - 1] = updater(messages[messages.length - 1]);
      return { messages };
    }),

  setIsAgentResponding: (responding) => set({ isAgentResponding: responding }),

  clearChat: () => set({ messages: [] }),
}));
```

**Test**: Import and use the store in a component to verify it works.

---

## 3. Phase 2: Search Tool

Create the LangChain tool that executes searches.

### Create `lib/agent/tools.ts`

```typescript
import { tool } from 'langchain';
import * as z from 'zod';
import { searchUnified } from '@/lib/search/search-service';

export const searchTool = tool(
  async ({ query, searchType }) => {
    console.log(`[TOOL] Executing search: "${query}" (${searchType})`);

    // Execute search using existing service
    const results = await searchUnified(
      [{ id: crypto.randomUUID(), type: 'text', value: query }],
      ['alibaba', 'madeinchina']
    );

    const output = {
      query,
      searchType,
      results: results.results,
      count: results.results.length,
    };

    console.log(`[TOOL] Search completed: ${output.count} results`);

    return output;
  },
  {
    name: 'search',
    description:
      'Searches for products or suppliers based on a text query. ' +
      'Use this tool when the user asks to find, search for, or look up products or suppliers.',
    schema: z.object({
      query: z
        .string()
        .min(1)
        .max(500)
        .describe('Free-form search query text.'),
      searchType: z
        .enum(['products', 'suppliers'])
        .default('products')
        .describe('Type of search: products or suppliers.'),
    }),
  }
);
```

**Test**: You can test the tool in isolation:

```typescript
const result = await searchTool.invoke({
  query: 'white sofas',
  searchType: 'products',
});
console.log(result);
```

---

## 4. Phase 3: Agent API Route

Create the streaming API route that runs the LangChain agent.

### Create `app/api/agent/chat/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createAgent } from 'langchain';
import { ChatOpenAI } from '@langchain/openai';
import { mapStoredMessageToChatMessage } from '@langchain/core/messages';
import { searchTool } from '@/lib/agent/tools';

export async function POST(request: NextRequest) {
  try {
    const { messages: serializedMessages } = await request.json();

    // Deserialize LangChain messages
    const messages = serializedMessages.map(mapStoredMessageToChatMessage);

    console.log(`[API] Received ${messages.length} messages`);

    // Create LangChain model
    const model = new ChatOpenAI({
      model: 'gpt-4.1-mini',
      temperature: 0.3,
      streaming: true,
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Create agent with search tool
    const agent = createAgent({
      model,
      tools: [searchTool],
      maxIterations: 6,
    });

    const encoder = new TextEncoder();

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Stream agent responses
          const streamIterator = await agent.stream(
            { messages },
            { streamMode: ['updates', 'messages'] }
          );

          for await (const chunk of streamIterator) {
            const [nodeName, nodeState] = Object.entries(chunk)[0];

            const event = {
              type: nodeName,
              data: {
                messages: (nodeState as any).messages || [],
              },
              timestamp: Date.now(),
            };

            // Send as NDJSON
            controller.enqueue(
              encoder.encode(JSON.stringify(event) + '\n')
            );
          }

          controller.close();
          console.log('[API] Stream completed');
        } catch (error) {
          console.error('[API] Stream error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error: any) {
    console.error('[API] Request error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
```

**Test**: Use `curl` or Postman to test the API:

```bash
curl -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"type":"human","content":"Find white sofas"}
    ]
  }'
```

---

## 5. Phase 4: UI Components

Build the chat sidebar UI using prompt-kit components.

### Create `components/agent/chat-sidebar.tsx`

```typescript
'use client';

import { useState } from 'react';
import { HumanMessage, AIMessage, ToolMessage } from '@langchain/core/messages';
import { useSearchStore } from '@/lib/agent/state';
import {
  ChatContainerRoot,
  ChatContainerContent,
  ChatContainerScrollAnchor,
} from '@/components/prompt-kit/chat-container';
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
  PromptInputAction,
} from '@/components/prompt-kit/prompt-input';
import { Message, MessageAvatar, MessageContent } from '@/components/prompt-kit/message';
import { Tool } from '@/components/prompt-kit/tool';
import { ThinkingBar } from '@/components/prompt-kit/thinking-bar';
import { Send } from 'lucide-react';

export function ChatSidebar() {
  const [input, setInput] = useState('');

  const messages = useSearchStore((state) => state.messages);
  const addMessage = useSearchStore((state) => state.addMessage);
  const isAgentResponding = useSearchStore((state) => state.isAgentResponding);
  const setIsAgentResponding = useSearchStore((state) => state.setIsAgentResponding);
  const setSearchResults = useSearchStore((state) => state.setSearchResults);
  const setSearchQuery = useSearchStore((state) => state.setSearchQuery);

  async function handleSubmit() {
    if (!input.trim() || isAgentResponding) return;

    const userMessage = new HumanMessage(input);
    addMessage(userMessage);
    setInput('');
    setIsAgentResponding(true);

    try {
      const response = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => m.toJSON()),
        }),
      });

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          const event = JSON.parse(line);

          if (event.type === 'model') {
            // AIMessage with content and/or tool_calls
            const msgs = event.data.messages || [];
            msgs.forEach((msgData: any) => {
              const msg = new AIMessage(msgData);
              addMessage(msg);
            });
          } else if (event.type === 'tools') {
            // ToolMessage with execution results
            const toolMsgs = event.data.messages || [];
            toolMsgs.forEach((tmData: any) => {
              const tm = new ToolMessage(tmData);
              addMessage(tm);

              // Update search results if tool is 'search'
              if (tm.name === 'search') {
                const output = JSON.parse(tm.content);
                setSearchResults(output.results);
                setSearchQuery(output.query);
              }
            });
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setIsAgentResponding(false);
    }
  }

  return (
    <div className="flex flex-col h-full border-l">
      <div className="p-4 border-b">
        <h2 className="font-semibold">AI Assistant</h2>
      </div>

      <ChatContainerRoot className="flex-1">
        <ChatContainerContent className="p-4 space-y-4">
          {messages.map((msg, idx) => {
            const msgType = msg._getType();

            if (msgType === 'human') {
              return (
                <Message key={idx}>
                  <MessageAvatar fallback="U" />
                  <MessageContent>{msg.content}</MessageContent>
                </Message>
              );
            }

            if (msgType === 'ai') {
              const aiMsg = msg as AIMessage;
              return (
                <div key={idx}>
                  <Message>
                    <MessageAvatar fallback="AI" />
                    <MessageContent markdown>{aiMsg.content}</MessageContent>
                  </Message>

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
                </div>
              );
            }

            if (msgType === 'tool') {
              const toolMsg = msg as ToolMessage;
              const output = JSON.parse(toolMsg.content);

              return (
                <Tool
                  key={idx}
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
          })}

          {isAgentResponding && <ThinkingBar text="Thinking..." />}
        </ChatContainerContent>
        <ChatContainerScrollAnchor />
      </ChatContainerRoot>

      <div className="p-4 border-t">
        <PromptInput
          value={input}
          onValueChange={setInput}
          onSubmit={handleSubmit}
          isLoading={isAgentResponding}
        >
          <PromptInputTextarea
            placeholder="Ask me to search..."
            disabled={isAgentResponding}
            rows={2}
          />
          <PromptInputActions>
            <PromptInputAction tooltip="Send">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isAgentResponding || !input.trim()}
              >
                <Send className="h-4 w-4" />
              </button>
            </PromptInputAction>
          </PromptInputActions>
        </PromptInput>
      </div>
    </div>
  );
}
```

---

## 6. Phase 5: Main Page Integration

Create the agent-search page with two-pane layout.

### Create `app/agent-search/page.tsx`

```typescript
'use client';

import { useSearchStore } from '@/lib/agent/state';
import { ChatSidebar } from '@/components/agent/chat-sidebar';
import { ProductGrid } from '@/components/search/product-grid';

export default function AgentSearchPage() {
  const searchResults = useSearchStore((state) => state.searchResults);
  const searchQuery = useSearchStore((state) => state.searchQuery);
  const isSearching = useSearchStore((state) => state.isSearching);

  return (
    <div className="flex h-screen">
      {/* Main search pane */}
      <div className="flex-1 overflow-auto p-8">
        <h1 className="text-3xl font-bold mb-4">Agent-Powered Search</h1>

        {searchQuery && (
          <p className="text-muted-foreground mb-6">
            Showing results for: <strong>{searchQuery}</strong>
          </p>
        )}

        <ProductGrid
          products={searchResults}
          onProductClick={(product) => {
            // Handle product click
            console.log('Product clicked:', product);
          }}
          loading={isSearching}
          emptyMessage="Ask the AI assistant to search for products"
          inputs={[]}
        />
      </div>

      {/* Chat sidebar */}
      <div className="w-96">
        <ChatSidebar />
      </div>
    </div>
  );
}
```

---

## 7. Testing & Debugging

### Manual Testing Checklist

- [ ] User can send messages in the chat sidebar
- [ ] Agent responds with natural language
- [ ] Agent calls search tool when user asks to find something
- [ ] Search results appear in both chat and main pane
- [ ] Tool execution shows "pending" → "completed" states
- [ ] Multiple searches update the main pane correctly
- [ ] Chat scrolls automatically to new messages
- [ ] Input is disabled while agent is responding

### Debugging Tips

**Enable Console Logs**:
- Check browser console for client-side logs
- Check terminal for API route logs (`[API]` and `[TOOL]` prefixes)

**Common Issues**:

1. **Agent doesn't call tool**:
   - Check tool description is clear
   - Try more explicit prompts like "Use the search tool to find X"

2. **Stream doesn't work**:
   - Verify OpenAI API key is set
   - Check Network tab in browser dev tools for streaming response

3. **Tool results don't update main pane**:
   - Verify `setSearchResults` is called in ToolMessage handler
   - Check Zustand store updates using React DevTools

4. **Messages don't serialize properly**:
   - Ensure `.toJSON()` is called before sending to API
   - Use `mapStoredMessageToChatMessage` when deserializing

---

## Next Steps

1. **Add Features**:
   - Multi-turn conversations with context
   - Clear chat button
   - Export chat history

2. **Improve UX**:
   - Loading skeletons for search results
   - Error handling UI
   - Stop generation button

3. **Performance**:
   - Virtualize chat messages for 100+ messages
   - Debounce search result updates

4. **Advanced**:
   - Add more tools (filter, compare, etc.)
   - Integrate with RAG for product knowledge
   - Add agent memory for personalization

---

## Resources

- [LangChain JS Docs](https://docs.langchain.com/oss/javascript/langchain/)
- [prompt-kit Docs](https://www.prompt-kit.com/docs)
- [Zustand Docs](https://zustand-demo.pmnd.rs/)
- [Next.js Streaming](https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming)

---

**Feature Spec**: [spec.md](./spec.md)
**Research**: [research.md](./research.md)
**Data Model**: [data-model.md](./data-model.md)
**Contracts**: [contracts/](./contracts/)
