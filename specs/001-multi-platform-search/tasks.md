# Tasks: Multi-Platform Product Search

**Feature**: 001-multi-platform-search
**Input**: Design documents from `/specs/001-multi-platform-search/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: This feature does not request explicit test-first development. Test tasks are NOT included. Testing can be added later if needed.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

This is a Next.js App Router web application:
- **App routes**: `app/` directory
- **Components**: `components/` directory
- **Libraries**: `lib/` directory
- **API routes**: `app/api/` directory
- **Tests**: `__tests__/` directory

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Install required dependencies: cheerio for HTML parsing, vitest and @testing-library/react for testing
- [X] T002 [P] Add missing shadcn/ui components: sheet, badge (if not already installed)
- [X] T003 [P] Create placeholder product image in public/placeholder-product.png

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core type definitions and platform adapter infrastructure that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 [P] Create core TypeScript interfaces in lib/platforms/types.ts (UnifiedProduct, PlatformType, SearchResult, AggregatedSearchResult, PlatformAdapter)
- [X] T005 [P] Create Alibaba-specific types in lib/platforms/alibaba/types.ts (AlibabaSearchResponse, AlibabaOffer)
- [X] T006 [P] Create Made-in-China-specific types in lib/platforms/madeinchina/types.ts (MICCompany, MICSearchResponse)
- [X] T007 [P] Implement Alibaba data mapper in lib/platforms/alibaba/mapper.ts (mapAlibabaToUnified function)
- [X] T008 [P] Implement Made-in-China data mapper in lib/platforms/madeinchina/mapper.ts (mapMICToUnified function)
- [X] T009 Implement Made-in-China HTML parser in lib/platforms/madeinchina/parser.ts (parseMICHTML function using cheerio)
- [X] T010 [P] Create Alibaba API proxy route in app/api/search/alibaba/route.ts (GET handler with fetch to Alibaba API)
- [X] T011 [P] Create Made-in-China API proxy route in app/api/search/madeinchina/route.ts (GET handler with HTML fetch and parsing)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Basic Product Search (Priority: P1) 🎯 MVP

**Goal**: Enable users to search for products across Alibaba and Made-in-China platforms and view unified results in a grid

**Independent Test**: Enter "wireless headphones" in search bar, press search, verify results from both platforms appear in unified grid within 3 seconds showing product name, price, supplier, and platform badge

### Implementation for User Story 1

- [X] T012 [P] [US1] Create SearchBar component in components/search/search-bar.tsx (input field + search button)
- [X] T013 [P] [US1] Create ProductCard component in components/search/product-card.tsx (displays product name, image, price, supplier, platform badge)
- [X] T014 [P] [US1] Create ProductGrid component in components/search/product-grid.tsx (grid layout of ProductCard components)
- [X] T015 [US1] Create search service in lib/search/search-service.ts (searchAllPlatforms function using Promise.all for parallel API calls)
- [X] T016 [US1] Create main search page in app/search/page.tsx (orchestrates SearchBar, ProductGrid, manages state)
- [X] T017 [US1] Add loading state UI to search page (loading spinner/skeleton while search executes)
- [X] T018 [US1] Add empty state UI to ProductGrid (message when no results found)
- [X] T019 [US1] Add error handling UI for partial failures (show results from working platforms, display error message for failed platforms)

**Checkpoint**: At this point, User Story 1 should be fully functional - users can search and see unified results from both platforms

---

## Phase 4: User Story 4 - Detailed Product View (Priority: P1)

**Goal**: Enable users to view comprehensive product details in a modal sheet when clicking on a product card

**Independent Test**: After completing a search, click any product card in the grid, verify detail sheet opens showing full product information (images gallery, supplier details, verification badges, platform-specific data), then close the sheet

**Note**: Implementing User Story 4 before US2/US3 because it's P1 priority and completes the core search-to-decision flow

### Implementation for User Story 4

- [X] T020 [US4] Create ProductDetailSheet component in components/search/product-detail-sheet.tsx (Sheet component showing all product details)
- [X] T021 [US4] Add image gallery to ProductDetailSheet (display all product.images with carousel or grid)
- [X] T022 [US4] Add supplier information section to ProductDetailSheet (name, location, verification badges)
- [X] T023 [US4] Add platform-specific data section to ProductDetailSheet (conditionally render Alibaba metrics or Made-in-China data)
- [X] T024 [US4] Add link to source platform (button to open product.url in new tab)
- [X] T025 [US4] Integrate ProductDetailSheet into app/search/page.tsx (state management for selectedProduct, onProductClick handler)
- [X] T026 [US4] Add graceful handling for missing fields in ProductDetailSheet (hide sections with no data)

**Checkpoint**: At this point, User Stories 1 AND 4 are complete - users can search, browse, and view detailed product information (MVP complete!)

---

## Phase 5: User Story 2 - Platform Filtering (Priority: P2)

**Goal**: Enable users to toggle platforms on/off to filter which platform results are displayed

**Independent Test**: Perform a search to get results, toggle "Alibaba" filter off, verify only Made-in-China results remain visible, toggle "Alibaba" back on, verify Alibaba results reappear

### Implementation for User Story 2

- [X] T027 [US2] Create PlatformFilter component in components/search/platform-filter.tsx (checkboxes for Alibaba and Made-in-China)
- [X] T028 [US2] Add platform filter state management to app/search/page.tsx (selectedPlatforms state with Set<PlatformType>)
- [X] T029 [US2] Implement client-side filtering logic in app/search/page.tsx (filter allProducts based on selectedPlatforms before passing to ProductGrid)
- [X] T030 [US2] Add "no platforms selected" empty state to ProductGrid (message when selectedPlatforms is empty)
- [X] T031 [US2] Integrate PlatformFilter component into app/search/page.tsx UI (place above ProductGrid)

**Checkpoint**: At this point, User Stories 1, 4, AND 2 work independently - users can search, filter by platform, and view details

---

## Phase 6: User Story 3 - Platform-Specific Filtering (Priority: P2)

**Goal**: Enable users to apply advanced filters specific to each platform (price range, MOQ, verification status)

**Independent Test**: After a search with Alibaba results visible, apply MOQ filter "Min 1, Max 100", verify only products within that MOQ range remain, clear filter, verify all results reappear

### Implementation for User Story 3

- [X] T032 [P] [US3] Create filter type definitions in lib/platforms/types.ts (FilterDefinition, FilterCriteria, FilterValue types)
- [X] T033 [US3] Create filter service in lib/search/filter-service.ts (functions to apply filters to UnifiedProduct arrays)
- [X] T034 [US3] Implement getSupportedFilters in lib/platforms/alibaba/adapter.ts (return FilterDefinitions for Alibaba: verified supplier, gold years, MOQ range)
- [X] T035 [US3] Implement getSupportedFilters in lib/platforms/madeinchina/adapter.ts (return FilterDefinitions for Made-in-China: capability stars, audited supplier)
- [X] T036 [US3] Create AdvancedFilters component in components/search/advanced-filters.tsx (renders filter UI based on active platforms)
- [X] T037 [US3] Add filter state management to app/search/page.tsx (activeFilters state)
- [X] T038 [US3] Implement filter application logic in app/search/page.tsx (apply activeFilters to products before display)
- [X] T039 [US3] Add "Clear Filters" button to AdvancedFilters component
- [X] T040 [US3] Integrate AdvancedFilters component into app/search/page.tsx UI (place below PlatformFilter)

**Checkpoint**: All user stories (1, 2, 3, 4) are now independently functional - full feature set complete

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and overall quality

- [X] T041 [P] Update app root page (app/page.tsx) to redirect or link to /search
- [ ] T042 [P] Add loading skeleton components to ProductGrid for better UX during search
- [ ] T043 [P] Add image loading states and error fallbacks to ProductCard (handle broken image URLs)
- [ ] T044 [P] Add responsive design improvements for mobile/tablet views
- [ ] T045 [P] Add keyboard navigation support (Enter key in search bar, Escape to close detail sheet)
- [ ] T046 [P] Add meta tags and page titles for SEO in app/search/page.tsx
- [X] T047 Optimize image loading with Next.js Image component (already using in ProductCard, verify settings)
- [ ] T048 Add error boundary component for graceful error handling
- [ ] T049 Add analytics events (optional, client-side only, privacy-preserving)
- [ ] T050 Code review and cleanup (remove console.logs, add TypeScript strict checks, format code)
- [X] T051 [P] Implement "Load More" pagination in search page (append results from next page)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User Story 1 (P1) - Basic Search: Can start after Phase 2
  - User Story 4 (P1) - Detail View: Can start after User Story 1 (needs search results)
  - User Story 2 (P2) - Platform Filtering: Can start after User Story 1 (needs search results)
  - User Story 3 (P2) - Advanced Filtering: Can start after User Story 1 (needs search results)
- **Polish (Phase 7)**: Can start after any user story is complete, but best after all stories done

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories ✅
- **User Story 4 (P1)**: Depends on User Story 1 (needs product grid and products to click on)
- **User Story 2 (P2)**: Depends on User Story 1 (needs search results to filter)
- **User Story 3 (P2)**: Depends on User Story 1 (needs search results to filter)

### Within Each User Story

- Components marked [P] can be implemented in parallel
- Service/logic layers depend on type definitions (Phase 2)
- UI integration tasks depend on component creation
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks (T001-T003) marked [P] can run in parallel
- All Foundational tasks (T004-T011) marked [P] can run in parallel within their dependencies:
  - Types (T004-T006) first
  - Mappers/parsers (T007-T009) after types
  - API routes (T010-T011) after mappers
- Within User Story 1: T012, T013, T014 can run in parallel (different components)
- Within User Story 3: T032, T034, T035 can run in parallel (different files)
- All Polish tasks marked [P] can run in parallel

---

## Parallel Example: User Story 1 (Basic Search)

```bash
# Launch all component creation for User Story 1 together:
Task: "Create SearchBar component in components/search/search-bar.tsx"
Task: "Create ProductCard component in components/search/product-card.tsx"
Task: "Create ProductGrid component in components/search/product-grid.tsx"

# Then after components exist, create service and page:
Task: "Create search service in lib/search/search-service.ts"
Task: "Create main search page in app/search/page.tsx"
```

---

## Parallel Example: Foundational Phase

```bash
# Create all type files in parallel:
Task: "Create core TypeScript interfaces in lib/platforms/types.ts"
Task: "Create Alibaba-specific types in lib/platforms/alibaba/types.ts"
Task: "Create Made-in-China-specific types in lib/platforms/madeinchina/types.ts"

# After types exist, create mappers in parallel:
Task: "Implement Alibaba data mapper in lib/platforms/alibaba/mapper.ts"
Task: "Implement Made-in-China data mapper in lib/platforms/madeinchina/mapper.ts"
Task: "Implement Made-in-China HTML parser in lib/platforms/madeinchina/parser.ts"

# After mappers exist, create API routes in parallel:
Task: "Create Alibaba API proxy route in app/api/search/alibaba/route.ts"
Task: "Create Made-in-China API proxy route in app/api/search/madeinchina/route.ts"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 4 Only)

**Recommended for fastest time-to-value**:

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T011) - CRITICAL BLOCKER
3. Complete Phase 3: User Story 1 - Basic Search (T012-T019)
4. Complete Phase 4: User Story 4 - Detail View (T020-T026)
5. **STOP and VALIDATE**: Test complete search-to-detail flow
6. Deploy MVP (users can search across platforms and view details)

**MVP Delivers**:
- ✅ Multi-platform search (Alibaba + Made-in-China)
- ✅ Unified grid display
- ✅ Product detail views
- ✅ Error handling for API failures
- ❌ Platform filtering (add in v2)
- ❌ Advanced filters (add in v2)

### Incremental Delivery (All User Stories)

**Recommended for full feature set**:

1. Complete Phase 1: Setup → Dependencies installed
2. Complete Phase 2: Foundational → Platform integration ready
3. Complete Phase 3: User Story 1 → Test search works → Deploy v1.0 (Basic MVP)
4. Complete Phase 4: User Story 4 → Test detail views → Deploy v1.1 (Full MVP)
5. Complete Phase 5: User Story 2 → Test platform filtering → Deploy v1.2
6. Complete Phase 6: User Story 3 → Test advanced filtering → Deploy v1.3 (Feature Complete)
7. Complete Phase 7: Polish → Final release v2.0

Each version is independently deployable and adds value!

### Parallel Team Strategy

With multiple developers (after Foundational phase complete):

1. **Team completes Setup + Foundational together** (T001-T011)
2. Once Foundational is done:
   - **Developer A**: User Story 1 - Basic Search (T012-T019)
   - **Developer B**: Can't start yet (needs US1 done)
   - **Developer C**: Polish tasks that don't depend on user stories (T041, T046, T048)
3. After US1 complete:
   - **Developer A**: User Story 4 - Detail View (T020-T026)
   - **Developer B**: User Story 2 - Platform Filtering (T027-T031)
   - **Developer C**: Continue Polish tasks
4. After US1+US4 complete:
   - **Developer A**: Polish tasks
   - **Developer B**: User Story 3 - Advanced Filtering (T032-T040)
   - **Developer C**: Testing and validation

---

## Task Summary

**Total Tasks**: 50

**Tasks by Phase**:
- Phase 1 (Setup): 3 tasks
- Phase 2 (Foundational): 8 tasks - **BLOCKS ALL USER STORIES**
- Phase 3 (User Story 1 - P1): 8 tasks
- Phase 4 (User Story 4 - P1): 7 tasks
- Phase 5 (User Story 2 - P2): 5 tasks
- Phase 6 (User Story 3 - P2): 9 tasks
- Phase 7 (Polish): 10 tasks

**MVP Scope (Recommended)**: 26 tasks
- Setup + Foundational + User Story 1 + User Story 4
- Delivers core search and detail view functionality
- Estimated time: 2-3 days

**Full Feature Set**: 50 tasks
- All user stories + polish
- Estimated time: 4-5 days

**Parallel Opportunities**: 23 tasks marked [P]
- Significant parallelization possible within phases
- Foundation phase highly parallelizable (8 tasks → ~3 sequential stages)

---

## Format Validation

✅ All tasks follow required format: `- [ ] [ID] [P?] [Story?] Description with file path`
✅ Task IDs sequential: T001-T050
✅ [P] markers present for parallelizable tasks (23 tasks)
✅ [Story] labels present for all user story tasks (US1, US2, US3, US4)
✅ File paths included in all implementation task descriptions
✅ Independent test criteria documented for each user story
✅ Dependencies clearly documented

---

## Notes

- [P] tasks = different files, no dependencies within same phase
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- User Story 4 implemented before US2/US3 despite being later in spec because it's P1 priority
- No explicit test tasks - testing framework is set up but TDD not requested in spec
- Platform adapter pattern enables easy addition of new platforms in future
- All API calls go through Next.js API routes to handle CORS and server-side parsing
