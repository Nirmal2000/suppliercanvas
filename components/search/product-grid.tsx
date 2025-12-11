'use client';

import { UnifiedSupplier } from '@/lib/platforms/types';
import { SupplierCard } from './supplier-card';
import { Package } from 'lucide-react';

interface ProductGridProps {
  products: UnifiedSupplier[];
  onProductClick: (product: UnifiedSupplier) => void;
  loading?: boolean;
  emptyMessage?: string;
}

export function ProductGrid({
  products,
  onProductClick,
  loading = false,
  emptyMessage = "No products found. Try a different search query or adjust your filters."
}: ProductGridProps) {
  // Loading skeleton
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="border rounded-lg overflow-hidden animate-pulse"
          >
            <div className="aspect-square bg-muted" />
            <div className="p-4 space-y-3">
              <div className="h-4 bg-muted rounded w-1/3" />
              <div className="h-4 bg-muted rounded w-full" />
              <div className="h-3 bg-muted rounded w-2/3" />
              <div className="h-4 bg-muted rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="rounded-full bg-muted p-6 mb-4">
          <Package className="h-12 w-12 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No Products Found</h3>
        <p className="text-muted-foreground max-w-md">
          {emptyMessage}
        </p>
      </div>
    );
  }

  // Product grid (actually Supplier Grid now)
  return (
    <div className="flex flex-col gap-6">
      {products.map((supplier) => (
        <SupplierCard
          key={supplier.id}
          supplier={supplier}
          onClick={() => onProductClick(supplier)}
          // Since the main sheet logic expects a 'UnifiedSupplier', we handle clicks on products 
          // by potentially opening the same sheet but maybe scrolling to products?
          // For now, let's keep it simple: clicking a product also opens the Supplier Sheet
          // But ideally we might want a 'Product specific' view later.
          // The current `onProductClick` (inherited prop name) takes a UnifiedSupplier.
          // So we just call it with the supplier.
          onProductClick={(product) => onProductClick(supplier)}
        />
      ))}
    </div>
  );
}
