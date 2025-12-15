'use client';

import { useState, useCallback } from 'react';
import * as micParser from '@/lib/scrapers/mic-parser';
import * as alibabaParser from '@/lib/scrapers/alibaba-parser';
import { firecrawlQueue } from '@/lib/scrapers/firecrawl-queue';
import type {
    ProductGroup,
    ProductItem,
    ProductDetail,
    ScrapeResponse
} from '@/lib/scrapers/mic-types';
import type {
    AlibabaProductGroup,
    AlibabaProductItem,
    AlibabaProductDetail
} from '@/lib/scrapers/alibaba-types';

type Platform = 'mic' | 'alibaba';

function detectPlatform(url: string): Platform {
    if (url.includes('alibaba.com') || url.includes('.alibaba.')) {
        return 'alibaba';
    }
    return 'mic';
}
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

type Phase = 'input' | 'groups' | 'products';

async function scrapeUrl(url: string, platform: Platform): Promise<string> {
    return firecrawlQueue.add(async () => {
        const endpoint = platform === 'alibaba' ? '/api/scrape/alibaba' : '/api/scrape/mic';
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
        });
        const data: ScrapeResponse = await response.json();
        if (!data.success || !data.html) {
            throw new Error(data.error || 'Failed to scrape URL');
        }
        return data.html;
    });
}

export default function SupplierImportPage() {
    const [phase, setPhase] = useState<Phase>('input');
    const [supplierUrl, setSupplierUrl] = useState('');
    const [platform, setPlatform] = useState<Platform>('mic');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Phase 2: Product groups (use union type for both platforms)
    const [productGroups, setProductGroups] = useState<(ProductGroup | AlibabaProductGroup)[]>([]);
    const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());

    // Phase 3: Products (use union type)
    const [products, setProducts] = useState<(ProductDetail | AlibabaProductDetail)[]>([]);
    const [scrapeProgress, setScrapeProgress] = useState({ current: 0, total: 0 });

    // Pagination state
    const [nextPageUrls, setNextPageUrls] = useState<string[]>([]);
    const [seenProductIds, setSeenProductIds] = useState<Set<string>>(new Set());
    const [loadingMore, setLoadingMore] = useState(false);

    // Flatten groups to get all leaf nodes
    const getAllLeafGroups = useCallback((groups: (ProductGroup | AlibabaProductGroup)[]): (ProductGroup | AlibabaProductGroup)[] => {
        const leaves: (ProductGroup | AlibabaProductGroup)[] = [];
        for (const group of groups) {
            if (group.children && group.children.length > 0) {
                leaves.push(...group.children);
            } else if (group.isLeaf) {
                leaves.push(group);
            }
        }
        return leaves;
    }, []);

    const handleFetchGroups = async () => {
        if (!supplierUrl.trim()) return;

        setLoading(true);
        setError(null);

        try {
            const detectedPlatform = detectPlatform(supplierUrl);
            setPlatform(detectedPlatform);

            const productListUrl = detectedPlatform === 'alibaba'
                ? alibabaParser.getProductListUrl(supplierUrl)
                : micParser.getProductListUrl(supplierUrl);
            const html = await scrapeUrl(productListUrl, detectedPlatform);
            const groups = detectedPlatform === 'alibaba'
                ? alibabaParser.parseProductGroups(html)
                : micParser.parseProductGroups(html);

            if (groups.length === 0) {
                throw new Error('No product groups found. Please check the URL.');
            }

            setProductGroups(groups);
            setPhase('groups');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch product groups');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleGroup = (url: string) => {
        setSelectedGroups(prev => {
            const next = new Set(prev);
            if (next.has(url)) {
                next.delete(url);
            } else {
                next.add(url);
            }
            return next;
        });
    };

    // Fetch product details one by one
    const fetchProductDetails = async (items: (ProductItem | AlibabaProductItem)[], seen: Set<string>) => {
        const newSeen = new Set(seen);

        for (const item of items) {
            if (newSeen.has(item.id)) continue;
            newSeen.add(item.id);

            try {
                const html = await scrapeUrl(item.url, platform);
                const detail = platform === 'alibaba'
                    ? alibabaParser.parseProductDetail(html, item.url)
                    : micParser.parseProductDetail(html, item.url);
                setProducts(prev => [...prev, detail]);
            } catch (err) {
                console.error(`Failed to fetch product ${item.title}:`, err);
            }

            setScrapeProgress(prev => ({ current: prev.current + 1, total: prev.total }));
        }

        setSeenProductIds(newSeen);
    };

    const handleFetchProducts = async () => {
        if (selectedGroups.size === 0) return;

        setLoading(true);
        setError(null);
        setProducts([]);
        setNextPageUrls([]);
        setSeenProductIds(new Set());
        setPhase('products');

        try {
            const allLeaves = getAllLeafGroups(productGroups);
            const selectedLeaves = allLeaves.filter(g => selectedGroups.has(g.url));

            const allFirstPageItems: (ProductItem | AlibabaProductItem)[] = [];
            const nextPages: string[] = [];

            for (const group of selectedLeaves) {
                try {
                    const html = await scrapeUrl(group.url, platform);
                    const items = platform === 'alibaba'
                        ? alibabaParser.parseProductList(html)
                        : micParser.parseProductList(html);
                    allFirstPageItems.push(...items);

                    // Only MIC supports pagination
                    if (platform === 'mic') {
                        const nextUrl = micParser.getNextPageUrl(group.url);
                        if (nextUrl && items.length > 0) {
                            nextPages.push(nextUrl);
                        }
                    }
                } catch (err) {
                    console.error(`Failed to fetch group ${group.name}:`, err);
                }
            }

            setScrapeProgress({ current: 0, total: allFirstPageItems.length });
            setNextPageUrls(nextPages);

            await fetchProductDetails(allFirstPageItems, new Set());

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch products');
        } finally {
            setLoading(false);
        }
    };

    const handleLoadMore = async () => {
        if (nextPageUrls.length === 0 || platform === 'alibaba') return;

        setLoadingMore(true);
        setError(null);

        try {
            const newItems: ProductItem[] = [];
            const newNextPages: string[] = [];

            for (const pageUrl of nextPageUrls) {
                try {
                    const html = await scrapeUrl(pageUrl, platform);
                    const items = micParser.parseProductList(html);

                    if (items.length > 0) {
                        newItems.push(...items);
                        const nextUrl = micParser.getNextPageUrl(pageUrl);
                        if (nextUrl) {
                            newNextPages.push(nextUrl);
                        }
                    }
                } catch (err) {
                    console.error(`Failed to fetch page ${pageUrl}:`, err);
                }
            }

            setNextPageUrls(newNextPages);
            setScrapeProgress(prev => ({ ...prev, total: prev.total + newItems.length }));

            await fetchProductDetails(newItems, seenProductIds);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load more products');
        } finally {
            setLoadingMore(false);
        }
    };

    const handleReset = () => {
        setPhase('input');
        setSupplierUrl('');
        setProductGroups([]);
        setSelectedGroups(new Set());
        setProducts([]);
        setScrapeProgress({ current: 0, total: 0 });
        setNextPageUrls([]);
        setSeenProductIds(new Set());
        setLoadingMore(false);
        setError(null);
    };

    return (
        <div className="min-h-screen p-6 max-w-7xl mx-auto">
            <header className="mb-8 flex flex-col gap-2">
                <h1 className="text-3xl font-bold">Supplier Import</h1>
                <p className="text-muted-foreground">Import products from Made-in-China or Alibaba suppliers</p>
                {phase !== 'input' && (
                    <Button variant="outline" onClick={handleReset} className="self-start mt-2">
                        ← Start Over
                    </Button>
                )}
            </header>

            {error && (
                <div className="bg-destructive/10 border border-destructive/30 text-destructive p-4 rounded-lg mb-6">
                    {error}
                </div>
            )}

            {/* Phase 1: URL Input */}
            {phase === 'input' && (
                <div className="max-w-2xl">
                    <div className="flex gap-3">
                        <Input
                            type="text"
                            value={supplierUrl}
                            onChange={(e) => setSupplierUrl(e.target.value)}
                            placeholder="Enter supplier URL (e.g., supplier.en.made-in-china.com or supplier.en.alibaba.com)"
                            disabled={loading}
                            className="flex-1"
                        />
                        <Button
                            onClick={handleFetchGroups}
                            disabled={loading || !supplierUrl.trim()}
                        >
                            {loading ? 'Fetching...' : 'Fetch Product Groups'}
                        </Button>
                    </div>
                </div>
            )}

            {/* Phase 2: Group Selection */}
            {phase === 'groups' && (
                <div className="space-y-6">
                    <div>
                        <h2 className="text-xl font-semibold mb-1">Select Product Groups</h2>
                        <p className="text-muted-foreground text-sm">Select the product groups you want to import</p>
                    </div>

                    <div className="flex flex-col gap-3 max-w-xl">
                        {productGroups.map((group) => (
                            <Card key={group.url}>
                                <CardContent className="p-4">
                                    {group.children && group.children.length > 0 ? (
                                        <div>
                                            <span className="font-semibold block mb-3">{group.name}</span>
                                            <div className="flex flex-wrap gap-3 pl-2">
                                                {group.children.map((child) => (
                                                    <label key={child.url} className="flex items-center gap-2 cursor-pointer">
                                                        <Checkbox
                                                            checked={selectedGroups.has(child.url)}
                                                            onCheckedChange={() => handleToggleGroup(child.url)}
                                                        />
                                                        <span className="text-sm">{child.name}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <Checkbox
                                                checked={selectedGroups.has(group.url)}
                                                onCheckedChange={() => handleToggleGroup(group.url)}
                                            />
                                            <span>{group.name}</span>
                                        </label>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <Button
                        onClick={handleFetchProducts}
                        disabled={loading || selectedGroups.size === 0}
                        className="mt-4"
                    >
                        {loading ? 'Fetching...' : `Fetch Products (${selectedGroups.size} groups selected)`}
                    </Button>
                </div>
            )}

            {/* Phase 3: Products Display */}
            {phase === 'products' && (
                <div className="flex flex-col gap-6">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex justify-between mb-2 text-sm">
                                <span>Scraping products...</span>
                                <span>{scrapeProgress.current} / {scrapeProgress.total}</span>
                            </div>
                            <Progress
                                value={scrapeProgress.total > 0 ? (scrapeProgress.current / scrapeProgress.total) * 100 : 0}
                            />
                        </CardContent>
                    </Card>

                    <div className="flex flex-col gap-4">
                        {products.map((product, index) => (
                            <Card key={product.id || index}>
                                <CardContent className="p-4 grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-4">
                                    {/* Image Gallery */}
                                    <div className="overflow-hidden rounded-lg">
                                        <div className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory">
                                            {product.mediaUrls.length > 0 ? (
                                                product.mediaUrls.map((url, imgIndex) => (
                                                    <img
                                                        key={imgIndex}
                                                        src={url}
                                                        alt={`${product.title} - Image ${imgIndex + 1}`}
                                                        className="flex-shrink-0 w-44 h-44 object-cover rounded-lg snap-start bg-muted"
                                                    />
                                                ))
                                            ) : (
                                                <div className="w-44 h-44 flex items-center justify-center bg-muted text-muted-foreground rounded-lg">
                                                    No images
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Product Info */}
                                    <div className="flex flex-col gap-3">
                                        <h3 className="text-lg font-semibold leading-tight">{product.title}</h3>

                                        {/* Pricing */}
                                        {product.pricing.length > 0 && (
                                            <div className="flex flex-wrap gap-3">
                                                {product.pricing.map((tier, tierIndex) => (
                                                    <span key={tierIndex} className="flex flex-col px-3 py-2 bg-primary/10 rounded-md">
                                                        <span className="font-semibold text-primary">{tier.price}</span>
                                                        <span className="text-xs text-muted-foreground">{tier.quantity}</span>
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Attributes */}
                                        {Object.keys(product.attributes).length > 0 && (
                                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                                                {Object.entries(product.attributes).map(([key, value]) => (
                                                    <div key={key}>
                                                        <span className="text-muted-foreground">{key}:</span>{' '}
                                                        <span>{value}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Specs */}
                                        {product.specs.length > 0 && (
                                            <div className="flex flex-col gap-2 text-sm">
                                                {product.specs.map((spec, specIndex) => (
                                                    <div key={specIndex}>
                                                        <span className="text-muted-foreground">{spec.name}:</span>{' '}
                                                        <div className="inline-flex flex-wrap gap-2 mt-1">
                                                            {spec.values.map((v, vIndex) => (
                                                                <span key={vIndex} className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded text-xs">
                                                                    {v.imageUrl && (
                                                                        <img src={v.imageUrl} alt={v.label} className="w-5 h-5 object-cover rounded" />
                                                                    )}
                                                                    {v.label}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Supplier Info */}
                                        {(product.supplierName || product.supplierLocation) && (
                                            <div className="flex gap-4 text-sm text-muted-foreground">
                                                {product.supplierName && <span>{product.supplierName}</span>}
                                                {product.supplierLocation && <span>📍 {product.supplierLocation}</span>}
                                            </div>
                                        )}

                                        <a
                                            href={product.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary text-sm font-medium hover:underline mt-auto pt-2"
                                        >
                                            View on {platform === 'alibaba' ? 'Alibaba' : 'Made-in-China'} →
                                        </a>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Load More button */}
                    {!loading && !loadingMore && nextPageUrls.length > 0 && (
                        <Button onClick={handleLoadMore} variant="outline" className="self-center">
                            Load More Products
                        </Button>
                    )}

                    {loadingMore && (
                        <p className="text-center text-muted-foreground italic py-4">
                            Loading more products...
                        </p>
                    )}

                    {!loading && !loadingMore && products.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">
                            No products found in the selected groups.
                        </p>
                    )}

                    {!loading && !loadingMore && products.length > 0 && nextPageUrls.length === 0 && (
                        <p className="text-center text-muted-foreground text-sm py-4 border-t mt-4">
                            All products loaded
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}
