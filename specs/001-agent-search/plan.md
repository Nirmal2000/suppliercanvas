# Implementation Plan: Agent-Powered Search Integration

**Branch**: `001-agent-search` | **Date**: 2025-12-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-agent-search/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Integrate an AI agent-powered chat interface alongside the existing multi-platform search interface. The feature enables users to search using natural language through a chat sidebar, with the agent executing searches and displaying results in both the chat context and the main content area. The implementation requires shared state management between the main search pane and chat sidebar, agent tooling for search execution, and streaming responses for progressive feedback.

## Technical Context

**Language/Version**: TypeScript 5.x with Next.js 15.3.1

**Primary Dependencies**:
- Next.js (React 19) for UI framework
- NEEDS CLARIFICATION: AI/LLM integration library (LangChain, Vercel AI SDK, or custom)
- NEEDS CLARIFICATION: State management solution (Zustand, Jotai, React Context, or other)
- NEEDS CLARIFICATION: Streaming protocol (Server-Sent Events, WebSockets, or React Server Components streaming)
- Existing: Radix UI components, Tailwind CSS

**Storage**: Client-side only (chat history not persisted, lost on reload)

**Target Platform**: Web browsers (Next.js SSR/client-side)

**Project Type**: Web application (Next.js App Router)

**Performance Goals**:
- Chat message streaming: visible progress within 500ms (SC-006)
- Search result display: <2 seconds from tool execution completion (SC-003)
- Manual search: <3 seconds end-to-end (SC-001)
- Smooth chat scrolling with 100+ messages (SC-004)

**Constraints**:
- Must integrate with existing search API at `/api/search/unified`
- Must maintain existing search page layout and functionality
- Two-pane layout: main content + sidebar
- Real-time streaming required for agent responses
- No authentication required
- No database persistence (session-only chat)

**Scale/Scope**:
- Single new route for agent-powered search page
- 3-5 new React components (chat sidebar, message display, tool execution UI)
- 1-2 new API routes for agent interaction
- Agent tool definitions for search execution
- Shared state management layer

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Status**: ✅ PASSED - No project constitution defined

The project constitution file (`.specify/memory/constitution.md`) contains only template placeholders and no enforced principles. Therefore, no gates block this feature from proceeding to research and design phases.

**Post-Design Re-Check**: Will verify architectural decisions align with Next.js best practices and existing codebase patterns after Phase 1 completion.

---

**Post-Design Re-Evaluation (2025-12-11)**: ✅ PASSED

Architectural decisions verified:

1. **Next.js Best Practices**:
   - ✅ Uses App Router with proper route structure (`app/agent-search/page.tsx`)
   - ✅ API routes follow Next.js 15 patterns (`app/api/agent/chat/route.ts`)
   - ✅ Client components properly marked with `'use client'` directive
   - ✅ Streaming responses use native Web Streams API

2. **Existing Codebase Alignment**:
   - ✅ Reuses existing types (`UnifiedSupplier`, `SearchInput`)
   - ✅ Integrates with existing search service (`searchUnified`)
   - ✅ Follows existing component patterns (Radix UI, Tailwind CSS)
   - ✅ Maintains consistent TypeScript usage throughout

3. **Technology Choices**:
   - ✅ LangChain JS: Well-documented pattern for agent systems
   - ✅ Zustand: Lightweight, aligns with React patterns already in use
   - ✅ prompt-kit: Built on shadcn/ui (consistent with Radix UI components)
   - ✅ Native Web Streams: No external dependencies, Next.js native support

4. **Code Organization**:
   - ✅ Clear separation: `lib/agent/` for logic, `components/agent/` for UI
   - ✅ Type contracts exported from `contracts/` directory
   - ✅ Single format (LangChain messages) eliminates conversion complexity

**Conclusion**: Design aligns with project patterns and best practices. No violations or concerns identified.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
app/
├── agent-search/              # New route for agent-powered search
│   └── page.tsx              # Main page component with two-pane layout
├── api/
│   ├── agent/                # New agent API routes
│   │   └── chat/route.ts    # Streaming chat endpoint
│   └── search/
│       └── unified/route.ts  # Existing search API (no changes)

components/
├── agent/                     # New agent UI components
│   ├── chat-sidebar.tsx      # Chat interface container
│   ├── message-list.tsx      # Message display with streaming
│   ├── chat-input.tsx        # User input field
│   └── tool-execution.tsx    # Tool execution status UI
└── search/                    # Existing search components (reused)
    ├── product-grid.tsx
    └── ...

lib/
├── agent/                     # New agent logic
│   ├── tools.ts              # Tool definitions for search
│   ├── stream-handler.ts     # Streaming response handler
│   └── state.ts              # Shared state management
└── search/
    └── search-service.ts      # Existing (reused)
```

**Structure Decision**: Next.js App Router structure. New feature adds:
1. New route at `/agent-search` for the agent-powered interface
2. New API route at `/api/agent/chat` for agent streaming
3. New `components/agent/` directory for chat UI components
4. New `lib/agent/` directory for agent logic and state management
5. Reuses existing search components and services from current implementation

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

N/A - No constitution violations to justify.
