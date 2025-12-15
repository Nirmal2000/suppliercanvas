'use client';

import { useState, useMemo } from 'react';
import { Product, ProductDetail } from '@/lib/scrapers/mic-types';
import { ProductCard } from '@/components/god-view/product-card';
import { ProductDetailSheet } from '@/components/god-view/product-detail-sheet';

export default function SupplierGodView() {
    const [urls, setUrls] = useState('');
    const [keywords, setKeywords] = useState('');

    // Bucket state: Map<TaskKey, Product[]>
    // Key format: "${supplierUrl}::${keyword}"
    // This allows us to interleave results from EVERY unique search task (e.g. Supplier A + Sofa, Supplier A + Chair, etc.)
    const [taskBuckets, setTaskBuckets] = useState<Record<string, Product[]>>({});

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    // Selection state
    const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set());

    // Detail Sheet state
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);

    // --- Interleaving Logic ---
    // Computed property: "Zipped" list of products
    // We iterate 0..max, picking the i-th item from each bucket in a round-robin fashion
    const products = useMemo(() => {
        const buckets = Object.values(taskBuckets);
        const maxLen = Math.max(...buckets.map(b => b.length), 0);
        const result: Product[] = [];
        const seenUrls = new Set<string>();

        for (let i = 0; i < maxLen; i++) {
            for (const bucket of buckets) {
                if (i < bucket.length) {
                    const product = bucket[i];
                    // Deduplication: Only add if we haven't seen this URL yet
                    if (!seenUrls.has(product.url)) {
                        seenUrls.add(product.url);
                        result.push(product);
                    }
                }
            }
        }
        return result;
    }, [taskBuckets]);

    // Helpers
    const getTaskKey = (product: Product) => {
        const supplier = product.metadata.supplierUrl || 'unknown';
        const keyword = product.metadata.searchKeyword || 'unknown';
        return `${supplier}::${keyword}`;
    };

    // --- Scraping Logic ---
    const fetchProducts = async (pageToFetch: number, isNewSearch: boolean) => {
        setIsLoading(true);
        setError(null);
        if (isNewSearch) {
            setTaskBuckets({});
            setPage(1);
            setHasMore(true);
            setSelectedUrls(new Set());
        }

        const urlList = urls.split('\n').map(u => u.trim()).filter(u => u);
        const keywordList = keywords.split('\n').map(k => k.trim()).filter(k => k);

        if (urlList.length === 0 || keywordList.length === 0) {
            setError('Please enter at least one URL and one keyword.');
            setIsLoading(false);
            return;
        }

        let productsFoundInThisFetch = false;

        try {
            const response = await fetch('/api/scrape/god-view', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ urls: urlList, keywords: keywordList, page: pageToFetch }),
            });

            if (!response.ok) throw new Error('Failed to start scraping');
            if (!response.body) return;

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const newProducts: Product[] = JSON.parse(line);
                            if (newProducts.length > 0) {
                                productsFoundInThisFetch = true;

                                setTaskBuckets(prev => {
                                    const next = { ...prev };

                                    newProducts.forEach(p => {
                                        const key = getTaskKey(p);
                                        if (!next[key]) next[key] = [];
                                        next[key].push(p);
                                    });

                                    return next;
                                });
                            }
                        } catch (e) {
                            console.error('Error parsing JSON chunk:', e);
                        }
                    }
                }
            }

            if (!productsFoundInThisFetch) {
                setHasMore(false);
            } else {
                setPage(pageToFetch);
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const handleScrape = () => fetchProducts(1, true);
    const handleLoadMore = () => fetchProducts(page + 1, false);

    // --- Selection Handlers ---
    const toggleSelection = (url: string) => {
        const newSelection = new Set(selectedUrls);
        if (newSelection.has(url)) newSelection.delete(url);
        else newSelection.add(url);
        setSelectedUrls(newSelection);
    };

    const handleSelectAll = () => setSelectedUrls(new Set(products.map(p => p.url)));
    const handleClearSelection = () => setSelectedUrls(new Set());

    // --- Export Logic ---
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState('');

    const handleExportCsv = async () => {
        const productsToExport = products.filter(p => selectedUrls.has(p.url));
        if (productsToExport.length === 0) return;

        setIsExporting(true);
        setExportProgress(`0/${productsToExport.length}`);

        // Create a copy of the current products to update state as we go
        // We clone deep to avoid mutating the derived state directly
        const enrichedProducts = JSON.parse(JSON.stringify(productsToExport));
        let completed = 0;

        try {
            for (let i = 0; i < enrichedProducts.length; i++) {
                const product = enrichedProducts[i];

                // Only fetch if we don't have the model number yet
                // (Assuming modelNo is a good proxy for "details loaded")
                if (!product.modelNo) {
                    try {
                        const response = await fetch('/api/scrape/mic/detail', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ url: product.url }),
                        });

                        if (response.ok) {
                            const detail: ProductDetail = await response.json();

                            // Merge details
                            const updatedProduct = {
                                ...product,
                                modelNo: detail.modelNo,
                                basicInfoHtml: detail.basicInfoHtml,
                                attributes: detail.attributes,
                                mediaUrls: detail.mediaUrls
                            };

                            enrichedProducts[i] = updatedProduct;

                            // Update global state -- tricky part with buckets
                            // We find the product in the buckets and update it
                            const key = getTaskKey(product);
                            setTaskBuckets(prev => {
                                const bucket = prev[key];
                                if (!bucket) return prev;

                                const nextBucket = bucket.map(p => p.url === product.url ? updatedProduct : p);
                                return { ...prev, [key]: nextBucket };
                            });
                        }
                    } catch (e) {
                        console.error(`Failed to fetch details for ${product.url}`, e);
                    }
                }

                completed++;
                setExportProgress(`${completed}/${productsToExport.length}`);
            }

            // Generate CSV with enriched data
            const headers = ['URL', 'Title', 'Model No.', 'Supplier', 'Keyword', 'Price', 'MOQ'];
            const rows = enrichedProducts.map((p: any) => [
                p.url,
                `"${p.title.replace(/"/g, '""')}"`,
                p.modelNo ? `"${p.modelNo.replace(/"/g, '""')}"` : '',
                `"${p.metadata.supplierUrl.replace(/^https?:\/\//, '').split('.')[0]}"`, // Extract supplier name
                `"${p.metadata.searchKeyword.replace(/"/g, '""')}"`,
                p.price ? `"${p.price}"` : '',
                p.moq ? `"${p.moq}"` : '',
            ]);

            const csvContent = [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `supplier_products_${new Date().toISOString().slice(0, 10)}.csv`;
            link.click();

        } catch (e) {
            console.error('Export failed', e);
            setError('Export failed. Check console for details.');
        } finally {
            setIsExporting(false);
            setExportProgress('');
        }
    };

    // --- Detail Fetching ---
    const handleCardClick = async (product: Product) => {
        // If in selection mode (at least one item selected), toggling click behavior
        if (selectedUrls.size > 0) {
            toggleSelection(product.url);
            return;
        }

        setSelectedProduct(product);
        setIsSheetOpen(true);
        setIsDetailLoading(true);
        setDetailError(null);

        // If we already have full details, we might skip fetching, but for now we re-fetch to be safe
        // In a clearer implementation, we checked if (product.basicInfoHtml) return;

        try {
            const response = await fetch('/api/scrape/mic/detail', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: product.url }),
            });

            if (!response.ok) throw new Error('Failed to fetch details');

            const detail: ProductDetail = await response.json();

            const updatedProduct = {
                ...product,
                modelNo: detail.modelNo,
                basicInfoHtml: detail.basicInfoHtml,
                attributes: detail.attributes,
                mediaUrls: detail.mediaUrls
            };
            setSelectedProduct(updatedProduct);

            // Update buckets
            const key = getTaskKey(product);
            setTaskBuckets(prev => {
                const bucket = prev[key];
                if (!bucket) return prev;

                const nextBucket = bucket.map(p => p.url === product.url ? updatedProduct : p);
                return { ...prev, [key]: nextBucket };
            });


        } catch (err) {
            setDetailError(err instanceof Error ? err.message : 'Failed to load details');
        } finally {
            setIsDetailLoading(false);
        }
    };

    return (
        <div className="min-h-screen p-8 bg-background text-foreground">
            <h1 className="text-3xl font-bold mb-8">Supplier God View</h1>

            <GodViewInputs
                urls={urls}
                setUrls={setUrls}
                keywords={keywords}
                setKeywords={setKeywords}
            />

            <div className="flex flex-wrap gap-4 mb-8 items-center">
                <button
                    onClick={handleScrape}
                    disabled={isLoading || isExporting}
                    className="px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 font-semibold transition-colors"
                >
                    {isLoading && page === 1 ? 'Scraping...' : 'Start Scraping'}
                </button>

                {products.length > 0 && (
                    <div className="flex items-center gap-2 ml-auto">
                        <span className="text-sm text-muted-foreground mr-2">
                            {selectedUrls.size} selected
                        </span>
                        <SelectionToolbar
                            onSelectAll={handleSelectAll}
                            onClear={handleClearSelection}
                            onExport={handleExportCsv}
                            hasSelection={selectedUrls.size > 0}
                            isExporting={isExporting}
                            exportProgress={exportProgress}
                        />
                    </div>
                )}
            </div>

            {error && (
                <div className="p-4 mb-8 bg-destructive/15 text-destructive rounded-lg border border-destructive/20">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
                {products.map((product: Product, index: number) => (
                    <ProductCard
                        key={`${product.url}-${index}`}
                        product={product}
                        isSelected={selectedUrls.has(product.url)}
                        onToggleSelection={toggleSelection}
                        onClick={handleCardClick}
                    />
                ))}
            </div>

            {products.length === 0 && !isLoading && !error && (
                <div className="text-center text-muted-foreground mt-12">
                    Enter URLs and Keywords, then click "Start Scraping" to see results here.
                </div>
            )}

            {products.length > 0 && hasMore && (
                <div className="flex justify-center mt-8 pb-12">
                    <button
                        onClick={handleLoadMore}
                        disabled={isLoading || isExporting}
                        className="px-8 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 disabled:opacity-50 font-semibold transition-colors"
                    >
                        {isLoading ? 'Loading...' : 'Load More'}
                    </button>
                </div>
            )}

            <ProductDetailSheet
                open={isSheetOpen}
                onOpenChange={setIsSheetOpen}
                product={selectedProduct}
                isLoading={isDetailLoading}
                error={detailError}
            />
        </div>
    );
}

// Sub-components for cleaner internal file structure
function GodViewInputs({ urls, setUrls, keywords, setKeywords }: any) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
                <label className="block text-sm font-medium mb-2 text-foreground">Supplier URLs (one per line)</label>
                <textarea
                    className="w-full h-32 p-3 border border-input bg-background rounded-lg text-foreground focus:ring-1 focus:ring-ring focus:outline-none"
                    placeholder="https://example.en.made-in-china.com"
                    value={urls}
                    onChange={(e) => setUrls(e.target.value)}
                />
            </div>
            <div>
                <label className="block text-sm font-medium mb-2 text-foreground">Keywords (one per line)</label>
                <textarea
                    className="w-full h-32 p-3 border border-input bg-background rounded-lg text-foreground focus:ring-1 focus:ring-ring focus:outline-none"
                    placeholder="sofa&#10;chair"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                />
            </div>
        </div>
    );
}

function SelectionToolbar({ onSelectAll, onClear, onExport, hasSelection, isExporting, exportProgress }: any) {
    return (
        <>
            <button onClick={onSelectAll} disabled={isExporting} className="px-4 py-2 text-sm border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md disabled:opacity-50">
                Select All
            </button>
            <button onClick={onClear} disabled={isExporting} className="px-4 py-2 text-sm border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md disabled:opacity-50">
                Clear
            </button>
            <button
                onClick={onExport}
                disabled={!hasSelection || isExporting}
                className="px-4 py-2 text-sm bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md disabled:opacity-50 min-w-[100px]"
            >
                {isExporting ? `Fetching (${exportProgress})...` : 'Export CSV'}
            </button>
        </>
    );
}
