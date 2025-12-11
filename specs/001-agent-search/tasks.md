# Tasks: Agent-Powered Search Integration

**Feature**: `001-agent-search`
**Status**: Pending
**Source**: Generated from `specs/001-agent-search/`

## Phase 1: Setup
*Goal: Initialize project with necessary dependencies and component libraries.*

- [x] T001 Install core dependencies (LangChain, OpenAI, Zod, Zustand) in `package.json`
- [x] T002 Install prompt-kit components (ChatContainer, Message, Tool, etc.) via shadcn/npx in `components/prompt-kit/`
- [x] T003 Verify `OPENAI_API_KEY` exists in `.env.local`

## Phase 2: Foundational (Blocking)
*Goal: Implement shared state management and base tool definitions required by all stories.*

- [x] T004 Create `contracts/index.ts` and related type definition files from the design phase
- [x] T005 [P] Create `lib/agent/state.ts` with Zustand store for shared searching/chatting state
- [x] T006 [P] Create `lib/agent/tools.ts` with `searchTool` definition wrapping existing search service

## Phase 3: User Story 1 - Direct Manual Search (P1)
*Goal: Users can search manually on the new two-pane layout, establishing the base UI.*

- [x] T007 [P] [US1] Create `components/agent/chat-sidebar.tsx` shell with input and message list (using `prompt-kit`)
- [x] T008 [P] [US1] Create `app/agent-search/page.tsx` implementing the split-pane layout (sidebar + results grid)
- [x] T009 [P] [US1] Integrate `ProductGrid` into `agent-search` page, reading from Zustand store (`searchResults`)
- [ ] T010 Wire up manual search input (if separate from chat) or verify existing search service updates Zustand store
- [ ] T011 Verify manual search updates both the grid and state without errors

## Phase 4: User Story 2 - Agent-Assisted Natural Language Search (P2)
*Goal: Agent can interpret natural language, execute search tools, and stream results.*

- [x] T012 Create `app/api/agent/chat/route.ts` implementing the streaming LangChain agent
- [x] T013 Implement `handleSubmit` logic in `components/agent/chat-sidebar.tsx` to call API
- [x] T014 Implement streaming response reader to parse NDJSON events in `components/agent/chat-sidebar.tsx`
- [x] T015 Update `components/agent/chat-sidebar.tsx` to render `HumanMessage` and streamed `AIMessage` content
- [x] T016 Implement tool usage visualization: render `ToolMessage` components in chat when agent searches
- [x] T017 Wire up tool execution results to update `searchResults` in Zustand store (linking Agent -> Main Grid)

## Phase 5: User Story 3 - Multi-Turn Agent Conversations (P3)
*Goal: Agent maintains context across multiple turns to answer follow-up questions.*

- [x] T018 Verify full message history is passed to `app/api/agent/chat/route.ts` on each request
- [x] T019 [P] Update `components/agent/chat-sidebar.tsx` to disable input while agent is responding (thinking state)
- [x] T020 Optimize `components/agent/chat-sidebar.tsx` scrolling behavior for long conversation history

## Phase 6: Polish & Cross-Cutting
*Goal: Refine UX, error handling, and performance.*

- [ ] T021 Add error handling and specific error messages in `components/agent/chat-sidebar.tsx`
- [ ] T022 Implement loading skeletons/thinking bars in `components/agent/chat-sidebar.tsx`
- [ ] T023 Verify responsive layout of `app/agent-search/page.tsx` on smaller screens
