"use client";

import { useState } from 'react';
import { ChatSidebar } from "@/components/agent/chat-sidebar";
import { ProductGrid } from "@/components/search/product-grid";
import { ProductDetailSheet } from "@/components/search/product-detail-sheet";
import { useSearchStore } from "@/lib/agent/state";
import { UnifiedSupplier } from "@/lib/platforms/types";

export default function AgentSearchPage() {
    const { searchResults, isSearching } = useSearchStore();

    // Local UI state for details view
    const [selectedSupplier, setSelectedSupplier] = useState<UnifiedSupplier | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);

    const handleProductClick = (supplier: UnifiedSupplier) => {
        setSelectedSupplier(supplier);
        setDetailOpen(true);
    };

    return (
        <div className="flex h-screen overflow-hidden bg-background">
            {/* 
        Chat Sidebar: 
        - Fixed width
        - Handles its own scrolling and state
      */}
            <ChatSidebar />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header */}
                <header className="px-6 py-4 border-b flex justify-between items-center bg-background/95 backdrop-blur z-10 sticky top-0">
                    <h1 className="text-xl font-semibold">Agent Results</h1>
                    <div className="text-sm text-muted-foreground">
                        {searchResults.length > 0 ? `${searchResults.length} suppliers found` : 'Ready to search'}
                    </div>
                </header>

                {/* Scrollable Grid Area */}
                <main className="flex-1 overflow-y-auto p-6 scroll-smooth">
                    <div className="max-w-[1600px] mx-auto">
                        <ProductGrid
                            products={searchResults}
                            loading={isSearching}
                            onProductClick={handleProductClick}
                            emptyMessage="Start a chat or ask for suppliers to see results here."
                        />
                    </div>
                </main>
            </div>

            {/* Details Sheet Overlay */}
            <ProductDetailSheet
                product={selectedSupplier}
                open={detailOpen}
                onOpenChange={setDetailOpen}
            />
        </div>
    );
}
