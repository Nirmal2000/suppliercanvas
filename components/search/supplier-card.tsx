'use client';

import { UnifiedSupplier, UnifiedProduct, SearchInput } from '@/lib/platforms/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { MapPin, ShieldCheck, Star, Link, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SupplierCardProps {
    supplier: UnifiedSupplier;
    onClick: () => void;
    onProductClick: (product: UnifiedProduct) => void;
    inputs?: SearchInput[];
}

export function SupplierCard({ supplier, onClick, onProductClick, inputs = [] }: SupplierCardProps) {
    // Determine matched inputs
    const matchedInputs = supplier.matchedInputIds?.map(id => inputs.find(i => i.id === id)).filter(Boolean) as SearchInput[] || [];
    // Platform badge styling
    const platformColor = supplier.platform === 'alibaba' ? 'default' : 'secondary';
    const platformName = supplier.platform === 'madeinchina' ? 'Made-in-China' : 'Alibaba';

    // Limit products displayed in the card preview
    const displayProducts = supplier.products?.slice(0, 4) || [];

    return (
        <Card
            className="group hover:border-primary/50 transition-colors w-full"
            data-testid="supplier-card"
        >
            <CardHeader className="p-4 bg-muted/30 border-b space-y-2">
                <div className="flex justify-between items-start">
                    <div className="space-y-1 flex-1 pointer-events-auto cursor-pointer" onClick={onClick}>
                        <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={platformColor} className="text-xs shrink-0">
                                {platformName}
                            </Badge>
                            {supplier.supplier.verification && supplier.supplier.verification.length > 0 && (
                                <div className="flex items-center gap-1 text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                                    <ShieldCheck className="h-3 w-3" />
                                    <span className="truncate max-w-[150px]">{supplier.supplier.verification[0]}</span>
                                </div>
                            )}
                        </div>

                        <h3 className="font-bold text-lg text-foreground hover:text-primary transition-colors">
                            {supplier.name}
                        </h3>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {supplier.supplier.location && (
                                <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {supplier.supplier.location}
                                </div>
                            )}
                        </div>

                        {/* Matched By Badges */}
                        {matchedInputs.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                                <span className="text-[10px] text-muted-foreground mr-1 self-center">Matched by:</span>
                                {matchedInputs.map(input => (
                                    <Badge key={input.id} variant="outline" className="text-[10px] px-1 py-0 h-5 bg-background border-dashed">
                                        {input.type === 'text' ? <Link className="h-2 w-2 mr-1" /> : <ImageIcon className="h-2 w-2 mr-1" />}
                                        <span className="max-w-[100px] truncate">{input.value}</span>
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="shrink-0">
                        <Button variant="outline" size="sm" onClick={onClick} className="text-xs h-8">
                            Details
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-4">
                {displayProducts.length > 0 ? (
                    <div>
                        <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wider">
                            Popular Products ({supplier.products.length})
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {displayProducts.map((product) => (
                                <div
                                    key={product.id}
                                    className="space-y-1 cursor-pointer group/product"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onProductClick(product);
                                    }}
                                >
                                    <div className="relative aspect-square rounded-md overflow-hidden bg-muted border">
                                        <Image
                                            src={product.image || '/placeholder-product.png'}
                                            alt={product.title}
                                            fill
                                            className="object-cover group-hover/product:scale-105 transition-transform duration-300"
                                            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 15vw"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.src = '/placeholder-product.png';
                                            }}
                                        />
                                    </div>
                                    <p className="text-xs font-medium truncate group-hover/product:text-primary transition-colors">
                                        {product.title}
                                    </p>
                                    {product.price && (
                                        <p className="text-[10px] text-muted-foreground truncate font-mono">
                                            {product.price}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="py-6 text-center text-sm text-muted-foreground bg-muted/20 rounded-md border border-dashed">
                        No products preview available
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
