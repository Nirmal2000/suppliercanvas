# Implementation Plan: Multi-Platform Product Search

**Branch**: `001-multi-platform-search` | **Date**: 2025-12-10 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-multi-platform-search/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Build a Next.js application that enables unified product searching across multiple B2B sourcing platforms (Alibaba and Made-in-China initially). The app provides a single search interface that queries both platform APIs, normalizes their different data structures into a unified schema, and displays results in a filterable grid. Users can apply platform-level and platform-specific filters, and view detailed product information in a modal sheet. The architecture must support easy addition of new platform integrations without modifying existing code. No authentication or data persistence is required - this is a stateless search and display application built with shadcn/ui components.

## Technical Context

**Language/Version**: TypeScript 5.x with Next.js (latest/15.3.1)
**Primary Dependencies**:
- Next.js 15.3.1 (App Router)
- React 19.0.0
- shadcn/ui components (@radix-ui primitives)
- Tailwind CSS 3.4.1
- Lucide React icons

**Storage**: N/A (stateless application, no data persistence)
**Testing**: Vitest + React Testing Library (unit/integration), Playwright (E2E)
**Target Platform**: Web browsers (modern browsers, last 2 major versions)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**:
- Initial search results within 3 seconds under normal network conditions
- Filter updates within 1 second (client-side filtering)
- Support for concurrent API requests to multiple platforms

**Constraints**:
- No backend database or auth system
- Must handle API failures gracefully (show partial results if one platform fails)
- Must normalize heterogeneous data structures from different platform APIs
- No CORS issues - use Next.js API routes as proxy if needed

**Scale/Scope**:
- 2 platforms initially (Alibaba, Made-in-China)
- Designed for easy addition of 5-10 more platforms
- Grid display of 20-100+ products per search
- Minimal state management (URL-based or React state only)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Note**: No project-specific constitution file exists yet. Applying general architectural principles:

### ✅ Simplicity Gate
- **Status**: PASS
- **Rationale**: Single-purpose application with no auth, no database, stateless operation. Minimal complexity.
- **Verification**: Feature scope limited to search, filter, display - no auxiliary systems needed.

### ✅ Modularity Gate
- **Status**: PASS with requirement
- **Rationale**: Platform integrations must be modular to support easy addition of new platforms
- **Verification**: Each platform adapter must be self-contained with standard interface
- **Action Required**: Define PlatformAdapter interface in Phase 1

### ✅ Component Reusability Gate
- **Status**: PASS
- **Rationale**: Using shadcn/ui component library for consistent, reusable UI components
- **Verification**: No custom component framework needed

### ✅ Performance Gate
- **Status**: PASS
- **Rationale**: Performance requirements are modest (3s search, 1s filter) and achievable with standard Next.js patterns
- **Verification**: Parallel API requests, client-side filtering, lazy loading if needed

### ✅ Testing Gate
- **Status**: PASS
- **Rationale**: Testing framework selected (Vitest + Playwright) based on research
- **Verification**: Vitest for fast unit/integration tests with React Testing Library, Playwright for cross-browser E2E tests

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
├── api/                          # Next.js API routes (platform proxy endpoints)
│   └── search/
│       ├── alibaba/route.ts      # Alibaba API proxy
│       └── madeinchina/route.ts  # Made-in-China API proxy
├── search/                       # Search feature page
│   ├── page.tsx                  # Main search UI
│   └── layout.tsx                # Search layout (if needed)
├── globals.css
└── layout.tsx                    # Root layout

components/
├── ui/                           # shadcn/ui base components (existing)
│   ├── button.tsx
│   ├── card.tsx
│   ├── input.tsx
│   ├── checkbox.tsx
│   ├── sheet.tsx                 # For product detail modal
│   └── ...
├── search/                       # Search feature components (NEW)
│   ├── search-bar.tsx            # Search input component
│   ├── product-grid.tsx          # Grid display of results
│   ├── product-card.tsx          # Individual product card
│   ├── product-detail-sheet.tsx  # Modal for product details
│   ├── platform-filter.tsx       # Platform toggle filters
│   └── advanced-filters.tsx      # Platform-specific filters
└── [existing auth components - not used for this feature]

lib/
├── platforms/                    # Platform integration layer (NEW)
│   ├── types.ts                  # UnifiedProduct, PlatformAdapter interfaces
│   ├── alibaba/
│   │   ├── adapter.ts            # Alibaba implementation of PlatformAdapter
│   │   ├── mapper.ts             # Maps Alibaba API response to UnifiedProduct
│   │   └── types.ts              # Alibaba-specific types
│   ├── madeinchina/
│   │   ├── adapter.ts            # Made-in-China implementation
│   │   ├── mapper.ts             # Maps MIC response to UnifiedProduct
│   │   └── types.ts              # MIC-specific types
│   └── registry.ts               # Platform registry for easy extensibility
├── search/                       # Search orchestration (NEW)
│   ├── search-service.ts         # Coordinates multi-platform searches
│   └── filter-service.ts         # Client-side filtering logic
└── utils.ts                      # Existing utilities

__tests__/                        # Test directory (NEW)
├── unit/
│   ├── platforms/
│   │   ├── alibaba-mapper.test.ts
│   │   └── madeinchina-mapper.test.ts
│   └── search/
│       └── filter-service.test.ts
├── integration/
│   └── api/
│       ├── alibaba-proxy.test.ts
│       └── madeinchina-proxy.test.ts
└── e2e/
    └── search-flow.spec.ts
```

**Structure Decision**: Next.js App Router web application structure. This is an existing Next.js project (with unused auth components from template) that we'll extend with a new search feature. The platform integration layer (`lib/platforms/`) uses the adapter pattern to ensure each platform is modular and self-contained, enabling easy addition of new platforms without modifying existing code.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations - all gates passed or have clear research tasks for NEEDS CLARIFICATION items.
