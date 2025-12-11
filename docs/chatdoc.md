Here’s a distilled “reference sheet” for the bits of **LangChain JS** and **prompt-kit** that matter for an agentic, tool-using, streaming chat UI — without talking about any specific app or stack.

---

## 1. LangChain JS – Agents, Tools & Streaming

### 1.1 Core idea

* LangChain JS provides **chat models**, **tools**, and **agents**.
* **Tools** are typed functions with schemas that an LLM can call. ([LangChain Docs][1])
* **Agents** combine a model and tools and run them in a loop until a final answer or iteration limit is reached. ([LangChain Docs][2])
* Agents can be **streamed**, yielding intermediate steps (`LLM → tools → LLM`) and final output. ([LangChain Docs][3])

---

### 1.2 Model setup (Chat model for tools & streaming)

Any OpenAI-compatible chat model can be wrapped in LangChain’s `ChatOpenAI` (or provider-specific wrappers). LangChain JS overview shows connecting to providers in a few lines. ([LangChain Docs][4])

```ts
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({
  model: "gpt-4.1-mini",   // or any compatible model
  temperature: 0.3,
  streaming: true,         // required for streaming responses
});
```

Key config flags:

* `streaming: true` – enables token/message streaming from the model.
* `temperature` – controls randomness.
* `model` – provider-specific name (OpenAI, OpenRouter, etc.).

---

### 1.3 Tools – defining callable functions with schemas

LangChain’s **tool system**:

* A tool “wraps” a function plus an input schema.
* Tools are passed to chat models or agents, enabling **tool calling**. ([LangChain Docs][1])
* Schemas can be **Zod** or **JSON Schema**; Zod is the common pattern. ([LangChain][5])

**Basic pattern using `tool()` + Zod:**

```ts
import { tool } from "langchain";
import * as z from "zod";

export const searchTool = tool(
  // Implementation
  async ({ query, limit }) => {
    // 1. Perform some operation (API call, DB query, etc.)
    const results = await performSearch(query, limit);

    // 2. Return structured JSON that the model and UI can use
    return {
      query,
      limit,
      results,
    };
  },
  // Metadata & schema
  {
    name: "search",
    description:
      "Searches for items based on a text query and optional limit.",
    schema: z.object({
      query: z.string().describe("Free-form search query text."),
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .default(10)
        .describe("Maximum number of results to return."),
    }),
  }
);
```

Notes (from LangChain JS tools docs): ([LangChain Docs][1])

* `tool(func, fields)` creates a `StructuredTool` with:

  * `name` – unique identifier used in tool calls.
  * `description` – natural language hint to the model about when to use it.
  * `schema` – Zod or JSON schema that describes the function arguments.
* Zod schemas are recommended; LangChain can infer and validate inputs.

Multiple tools can be collected into an array:

```ts
import { searchTool } from "./tools/search";
import { anotherTool } from "./tools/another";

const tools = [searchTool, anotherTool];
```

---

### 1.4 Agents – combining model + tools

LangChain’s **agents** are “tool-using loops”:

* `createAgent()` in JS provides a production-ready agent implementation. ([LangChain Docs][2])
* An agent:

  1. Receives messages (conversation so far).
  2. Calls the model to decide whether to use tools.
  3. Executes tools when requested.
  4. Feeds tool results back to the model.
  5. Repeats until a final text response or iteration limit.

**Basic agent setup:**

```ts
import { createAgent } from "langchain";
import { ChatOpenAI } from "@langchain/openai";
import { tools } from "./tools";

const model = new ChatOpenAI({
  model: "gpt-4.1-mini",
  streaming: true,
});

const agent = createAgent({
  model,
  tools,
  maxIterations: 6,       // safety / control
});
```

Invoking an agent once:

```ts
const result = await agent.invoke({
  messages: [
    { role: "user", content: "Find me X and summarize it." },
  ],
});

// result.messages is the final state; last message is usually the answer
```

Agents docs describe this loop and stop condition behavior. ([LangChain Docs][2])

---

### 1.5 Streaming – agent progress & messages

LangChain JS streaming docs explain two main pieces: ([LangChain Docs][3])

* **Agent progress streaming**: `streamMode: "updates"`

  * Emits an event after every agent step:

    * LLM step with tool calls
    * Tool step with results
    * Final LLM step with answer
* **Message/token streaming**: `streamMode: "messages"`

  * Emits message chunks (tokens + metadata) as they’re generated.

Both can be combined; streaming docs describe using multiple modes such as `"values"`, `"updates"`, `"messages"`, etc. ([LangChain Docs][3])

**Pattern (conceptual) for streaming agent updates:**

```ts
const streamIterator = await agent.stream(
  {
    messages: [
      { role: "user", content: "Search for AI news and summarize it." },
    ],
  },
  {
    // Choose which parts to stream:
    streamMode: ["updates", "messages"],
  }
);

for await (const chunk of streamIterator) {
  // chunk is typically a map of node name -> state at that step,
  // such as { "model": { messages: [...] } } or { "tools": { messages: [...] } }
  const [nodeName, nodeState] = Object.entries(chunk)[0];

  if (nodeName === "model") {
    // model step - may contain tool calls or final LLM text
    const messages = (nodeState as any).messages ?? [];
    const latest = messages[messages.length - 1];

    // latest.content holds the AI text; latest.tool_calls holds tool invocations
  }

  if (nodeName === "tools") {
    // tool step - contains ToolMessages with input/output
    const toolMessages = (nodeState as any).messages ?? [];
    // Each ToolMessage includes tool input/output in a structured form
  }
}
```

The JS streaming docs show `streamMode: "updates"` for step-level streaming and emphasize this sequence: LLM node → Tool node → LLM node. ([LangChain Docs][3])

This is the core reference pattern for building a custom protocol (e.g., mapping intermediate states to frontend events).

---

## 2. prompt-kit – Components for Chat UI

**prompt-kit** is a component library built on **shadcn/ui** for AI interfaces and chat apps. It provides **customizable, accessible components** for chat, tools, prompts, and loaders. ([GitHub][6])

Key chat-related components:

* **Chat Container** – scrollable chat area with smart auto-scroll. ([prompt-kit.com][7])
* **Message** – bubbles with avatar, markdown, actions. ([prompt-kit.com][8])
* **Tool** – visual representation of tool calls (input/output/state). ([prompt-kit.com][9])
* **Prompt Input** – multi-line input + actions for sending prompts. ([prompt-kit.com][10])
* **Loader / ThinkingBar** – indicators for “thinking” / “processing”. ([prompt-kit.com][11])

Each component is installed using the `shadcn add` CLI with a JSON URL. ([prompt-kit.com][7])

---

### 2.1 Chat Container

**Purpose**: Container for chat messages with intelligent auto-scroll behavior. ([prompt-kit.com][7])

Installation:

```bash
npx shadcn add "https://prompt-kit.com/c/chat-container.json"
```

Component API (simplified): ([prompt-kit.com][7])

* `ChatContainerRoot`

  * Provides scrolling behavior using `use-stick-to-bottom`.
  * Props:

    * `children: React.ReactNode`
    * `className?: string`
* `ChatContainerContent`

  * Wraps the message list inside the container.
  * Props:

    * `children: React.ReactNode`
    * `className?: string`
* `ChatContainerScrollAnchor`

  * Optional marker element for scroll targeting.
  * Props:

    * `className?: string`
    * `ref?: React.RefObject<HTMLDivElement>`

Basic usage pattern:

```tsx
import {
  ChatContainerRoot,
  ChatContainerContent,
  ChatContainerScrollAnchor,
} from "@/components/prompt-kit/chat-container";

function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative h-[500px]">
      <ChatContainerRoot className="h-full">
        <ChatContainerContent className="space-y-4">
          {children /* messages or other chat elements */}
        </ChatContainerContent>
        <ChatContainerScrollAnchor />
      </ChatContainerRoot>
    </div>
  );
}
```

The docs describe auto-scroll features like stick-to-bottom, smart scrolling, cancel/resume on user scroll, etc. ([prompt-kit.com][7])

---

### 2.2 Message

**Purpose**: Display individual chat messages with avatar, markdown support, and optional actions. ([prompt-kit.com][8])

Installation:

```bash
npx shadcn add "https://prompt-kit.com/c/message.json"
```

Main subcomponents: ([prompt-kit.com][8])

* `Message`

  * Container for a single message row.
* `MessageAvatar`

  * Props:

    * `src?: string`
    * `alt?: string`
    * `fallback?: string`
    * `delayMs?: number`
    * `className?: string`
* `MessageContent`

  * Props:

    * `markdown?: boolean` (render content as Markdown)
    * `children: React.ReactNode`
    * `className?: string`
* `MessageActions`, `MessageAction`

  * For optional buttons/menus attached to a message (e.g., copy, regenerate).

Typical pattern:

```tsx
import {
  Message,
  MessageAvatar,
  MessageContent,
} from "@/components/prompt-kit/message";

function ChatMessage({ role, content }: { role: "user" | "assistant"; content: string }) {
  const isUser = role === "user";

  return (
    <Message>
      <MessageAvatar fallback={isUser ? "U" : "AI"} />
      <MessageContent markdown>{content}</MessageContent>
    </Message>
  );
}
```

---

### 2.3 Tool

**Purpose**: Visualize tool invocation details (input, output, status, errors) in chat UIs. ([prompt-kit.com][9])

Installation:

```bash
npx shadcn add "https://prompt-kit.com/c/tool.json"
```

Component API (summary): ([prompt-kit.com][9])

* `Tool`

  * Props:

    * `toolPart: ToolPart`
    * `defaultOpen?: boolean`
    * `className?: string`
* `ToolPart` shape:

  * `type: string` – tool type/name.
  * `state: string` – `"pending" | "running" | "completed" | "error"` (convention).
  * `input: Record<string, unknown>` – arguments passed to the tool.
  * `output: Record<string, unknown>` – results.
  * `toolCallId: string` – identifier for this call.
  * `errorText: string` – error description, if any.

Conceptual usage:

```tsx
import { Tool } from "@/components/prompt-kit/tool";

const toolPart = {
  type: "search",
  state: "completed",
  input: { query: "example", limit: 10 },
  output: { results: [] },
  toolCallId: "call-123",
  errorText: "",
};

<Tool toolPart={toolPart} defaultOpen={false} />;
```

This maps neatly to LangChain tool events where each **tool invocation** has an ID, input payload, output payload, and a status.

---

### 2.4 Prompt Input

**Purpose**: Multi-line text input tailored for AI/chat prompts, with support for actions and custom submit handlers. ([prompt-kit.com][10])

Installation:

```bash
npx shadcn add "https://prompt-kit.com/c/prompt-input.json"
```

Main pieces & props: ([prompt-kit.com][10])

* `PromptInput`

  * `isLoading?: boolean`
  * `value: string`
  * `onValueChange: (value: string) => void`
  * `maxHeight?: number | string`
  * `onSubmit?: () => void`
  * `children?: React.ReactNode`
  * `className?: string`
* `PromptInputTextarea`

  * `disableAutosize?: boolean`
  * `className?: string`
  * `onKeyDown?: (e: KeyboardEvent) => void`
  * `disabled?: boolean`
  * All standard `<textarea>` props
* `PromptInputActions`

  * Container for buttons/icons.
* `PromptInputAction`

  * `tooltip?: React.ReactNode`
  * `children: React.ReactNode`
  * `side?: "top" | "bottom" | "left" | "right"`
  * `disabled?: boolean`
  * Inherits props from a Tooltip component.

Typical composition:

```tsx
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputActions,
  PromptInputAction,
} from "@/components/prompt-kit/prompt-input";

function PromptBar({
  value,
  onChange,
  onSubmit,
  isLoading,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
}) {
  return (
    <PromptInput
      value={value}
      onValueChange={onChange}
      onSubmit={onSubmit}
      isLoading={isLoading}
    >
      <PromptInputTextarea
        placeholder="Ask something..."
        disabled={isLoading}
        rows={2}
      />
      <PromptInputActions>
        <PromptInputAction tooltip="Send">
          {/* Any button element can go here */}
          <button type="button" onClick={onSubmit} disabled={isLoading || !value.trim()}>
            Send
          </button>
        </PromptInputAction>
      </PromptInputActions>
    </PromptInput>
  );
}
```

---

### 2.5 Loader & Thinking Bar

These components are for visual feedback while a model is “thinking” or tools are running. ([prompt-kit.com][11])

#### Loader

Installation:

```bash
npx shadcn add "https://prompt-kit.com/c/loader.json"
```

Key props: ([prompt-kit.com][11])

* `variant` – `"circular" | "classic" | "pulse" | "dots" | "typing" | ...`
* `size` – `"sm" | "md" | "lg"`
* `text?: string` – optional text label

Example:

```tsx
import { Loader } from "@/components/prompt-kit/loader";

<Loader variant="typing" size="md" text="Thinking..." />;
```

#### ThinkingBar

Installation:

```bash
npx shadcn add "https://prompt-kit.com/c/thinking-bar.json"
```

Key props: ([prompt-kit.com][12])

* `text?: string` – default `"Thinking"`
* `stopLabel?: string` – label for stop button (`"Answer now"` by default)
* `onStop?: () => void` – called when stop button is clicked
* `onClick?: () => void` – click handler for the bar
* `className?: string`

Example:

```tsx
import { ThinkingBar } from "@/components/prompt-kit/thinking-bar";

<ThinkingBar
  text="Deep reasoning in progress"
  stopLabel="Stop"
  onStop={() => {/* abort current request */}}
/>;
```

---

### 2.6 Putting prompt-kit pieces together (conceptually)

From the docs and templates, prompt-kit is designed so that a typical chat UI looks like: ([prompt-kit.com][7])

* `ChatContainerRoot` → scrollable region

  * `ChatContainerContent` → list of:

    * `Message` elements (user, assistant)
    * `Tool` elements (tool calls with input/output)
  * `ChatContainerScrollAnchor` → for auto scroll
* At the bottom: `PromptInput` → `PromptInputTextarea` + `PromptInputActions`+ `PromptInputAction`
* When generating:

  * `ThinkingBar` and/or `Loader` show “thinking” / “loading” state.

This is all library-level reference; it can be applied to any agentic chat scenario that streams from LangChain or other AI SDKs.

[1]: https://docs.langchain.com/oss/javascript/langchain/tools?utm_source=chatgpt.com "Tools - Docs by LangChain"
[2]: https://docs.langchain.com/oss/javascript/langchain/agents?utm_source=chatgpt.com "Agents - Docs by LangChain"
[3]: https://docs.langchain.com/oss/javascript/langchain/streaming?utm_source=chatgpt.com "Streaming - Docs by LangChain"
[4]: https://docs.langchain.com/oss/javascript/langchain/overview?utm_source=chatgpt.com "LangChain overview"
[5]: https://v02.api.js.langchain.com/functions/_langchain_core.tools.tool-1.html?utm_source=chatgpt.com "Function tool"
[6]: https://github.com/ibelick/prompt-kit?utm_source=chatgpt.com "ibelick/prompt-kit: Core building blocks for AI apps. High- ..."
[7]: https://www.prompt-kit.com/docs/chat-container "Chat Container - prompt-kit"
[8]: https://www.prompt-kit.com/docs/message "Message - prompt-kit"
[9]: https://www.prompt-kit.com/docs/tool "Tool - prompt-kit"
[10]: https://www.prompt-kit.com/docs/prompt-input "Prompt Input - prompt-kit"
[11]: https://www.prompt-kit.com/docs/loader "Loader - prompt-kit"
[12]: https://www.prompt-kit.com/docs/thinking-bar "Thinking Bar - prompt-kit"
