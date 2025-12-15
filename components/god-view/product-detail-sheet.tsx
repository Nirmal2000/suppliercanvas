'use client';

import { Product } from '@/lib/scrapers/mic-types';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";

interface ProductDetailSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    product: Product | null;
    isLoading: boolean;
    error: string | null;
}

export function ProductDetailSheet({ open, onOpenChange, product, isLoading, error }: ProductDetailSheetProps) {
    if (!product) return null;

    // Use mediaUrls if available, otherwise just the single main image
    const images = product.mediaUrls && product.mediaUrls.length > 0
        ? product.mediaUrls
        : [product.image];

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-[800px] overflow-y-auto p-0 flex flex-col h-full bg-background border-l shadow-2xl">
                {/* Fixed Header */}
                <div className="p-6 border-b bg-background sticky top-0 z-20">
                    <SheetHeader>
                        <SheetTitle className="leading-snug text-lg font-bold pr-8">{product.title || 'Product Details'}</SheetTitle>
                        <SheetDescription className="mt-2">
                            <a
                                href={product.url}
                                target="_blank"
                                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                            >
                                View on Supplier Site
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                            </a>
                        </SheetDescription>
                    </SheetHeader>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">

                    {/* Gallery Section - Horizontal Scroll */}
                    <div className="w-full">
                        <div className="flex gap-4 overflow-x-auto pb-4 snap-x scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
                            {images.map((img, idx) => (
                                <div key={idx} className="flex-shrink-0 w-[280px] h-[280px] rounded-xl overflow-hidden border bg-muted relative snap-center">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={img}
                                        alt={`${product.title} - ${idx + 1}`}
                                        className="w-full h-full object-contain bg-white"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = 'https://placehold.co/600?text=Image+Load+Error';
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Loading & Error States */}
                    {isLoading ? (
                        <div className="space-y-4 animate-pulse">
                            <div className="h-4 w-1/3 bg-muted rounded"></div>
                            <div className="h-24 bg-muted rounded"></div>
                            <div className="h-4 w-1/4 bg-muted rounded"></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="h-10 bg-muted rounded"></div>
                                <div className="h-10 bg-muted rounded"></div>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 text-sm">
                            Error loading details: {error}
                        </div>
                    ) : (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                            {/* Key Metrics */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-xl bg-muted/50 border">
                                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Price</div>
                                    <div className="text-lg font-bold text-foreground">{product.price || 'Contact Supplier'}</div>
                                </div>
                                <div className="p-4 rounded-xl bg-muted/50 border">
                                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">MOQ</div>
                                    <div className="text-lg font-bold text-foreground">{product.moq || 'N/A'}</div>
                                </div>
                            </div>

                            {/* Main Details (Attributes) */}
                            {product.attributes && Object.keys(product.attributes).length > 0 ? (
                                <div>
                                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                        <span className="w-1 h-6 bg-primary rounded-full"></span>
                                        Specifications
                                    </h3>
                                    <div className="border rounded-lg overflow-hidden divide-y">
                                        {Object.entries(product.attributes).map(([key, value], idx) => (
                                            <div key={key} className={`flex text-sm ${idx % 2 === 0 ? 'bg-muted/30' : 'bg-background'}`}>
                                                <div className="w-1/3 p-3 font-medium text-muted-foreground border-r">{key}</div>
                                                <div className="w-2/3 p-3 text-foreground break-words">{value}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : null}

                            {/* Fallback to HTML if attributes missing (or if we prefer showing it) */}
                            {/* We only show this if attributes map is empty to avoid duplication, or could show distinct sections if we parsed differently. 
                                For now, attributes map is cleaner. We can hide the HTML view if we have attributes. 
                            */}
                            {(!product.attributes || Object.keys(product.attributes).length === 0) && product.basicInfoHtml && (
                                <div>
                                    <h3 className="text-lg font-semibold mb-4">Product Description</h3>
                                    <div
                                        className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground [&_table]:w-full [&_td]:p-2 [&_td]:border-b [&_th]:text-left [&_th]:p-2 [&_th]:font-semibold"
                                        dangerouslySetInnerHTML={{ __html: product.basicInfoHtml }}
                                    />
                                </div>
                            )}

                        </div>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}

