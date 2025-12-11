import { create } from 'zustand';
import { SharedSearchState } from '@/contracts/state.types';

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
