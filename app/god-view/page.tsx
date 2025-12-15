'use client';

import { useState } from 'react';
import { Product } from '@/lib/scrapers/mic-types';

export default function SupplierGodView() {
    const [urls, setUrls] = useState('');
    const [keywords, setKeywords] = useState('');
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const fetchProducts = async (pageToFetch: number, isNewSearch: boolean) => {
        setIsLoading(true);
        setError(null);
        if (isNewSearch) {
            setProducts([]);
            setPage(1);
            setHasMore(true);
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
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ urls: urlList, keywords: keywordList, page: pageToFetch }),
            });

            if (!response.ok) {
                throw new Error('Failed to start scraping');
            }

            if (!response.body) return;

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');

                // Process all complete lines
                buffer = lines.pop() || ''; // Keep the incomplete line in buffer

                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const newProducts = JSON.parse(line);
                            if (newProducts.length > 0) {
                                productsFoundInThisFetch = true;
                                setProducts(prev => [...prev, ...newProducts]);
                            }
                        } catch (e) {
                            console.error('Error parsing JSON chunk:', e);
                        }
                    }
                }
            }

            // If no products were found in this entire fetch, assume we reached the end
            if (!productsFoundInThisFetch) {
                setHasMore(false);
            } else {
                // If successful and we found products, update current page
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

    return (
        <div className="min-h-screen p-8 bg-background text-foreground">
            <h1 className="text-3xl font-bold mb-8">Supplier God View</h1>

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

            <button
                onClick={handleScrape}
                disabled={isLoading}
                className="w-full md:w-auto px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 font-semibold transition-colors mb-8"
            >
                {isLoading && page === 1 ? 'Scraping...' : 'Start Scraping'}
            </button>

            {error && (
                <div className="p-4 mb-8 bg-destructive/15 text-destructive rounded-lg border border-destructive/20">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
                {products.map((product, index) => (
                    <div key={`${product.url}-${index}`} className="bg-card text-card-foreground rounded-lg shadow-sm border border-border hover:shadow-md transition-shadow overflow-hidden flex flex-col h-full text-sm">
                        <div className="aspect-square relative flex-shrink-0 bg-muted">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={product.image}
                                alt={product.title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://placehold.co/400?text=No+Image';
                                }}
                            />
                        </div>
                        <div className="p-3 flex flex-col flex-grow">
                            <div className="text-xs text-muted-foreground mb-1 flex justify-between items-center">
                                <span className="uppercase font-semibold">{product.source}</span>
                                <span className="truncate max-w-[50%] ml-2" title={product.metadata.searchKeyword}>{product.metadata.searchKeyword}</span>
                            </div>

                            <a
                                href={product.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-card-foreground line-clamp-2 hover:text-primary mb-2 leading-tight"
                                title={product.title}
                            >
                                {product.title}
                            </a>

                            <div className="mt-auto space-y-1">
                                {product.price && (
                                    <div className="text-red-600 dark:text-red-400 font-bold">{product.price}</div>
                                )}
                                {product.moq && (
                                    <div className="text-muted-foreground text-xs">Min: {product.moq}</div>
                                )}
                            </div>
                        </div>
                    </div>
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
                        disabled={isLoading}
                        className="px-8 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 disabled:opacity-50 font-semibold transition-colors"
                    >
                        {isLoading ? 'Loading...' : 'Load More'}
                    </button>
                </div>
            )}
        </div>
    );
}
