'use client';

import { UnifiedSupplier } from '@/lib/platforms/types';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { MapPin } from 'lucide-react';

interface ProductCardProps {
  product: UnifiedSupplier;
  onClick: () => void;
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  const primaryImage = product.images[0] || '/placeholder-product.png';

  // Platform badge colors
  const platformColor = product.platform === 'alibaba' ? 'default' : 'secondary';

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-shadow group"
      onClick={onClick}
      data-testid="product-card"
    >
      <CardHeader className="p-0">
        <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide no-scrollbar h-full w-full">
          {product.images.length > 0 ? (
            product.images.map((image, index) => (
              <div key={index} className="relative flex-none w-full h-full snap-center">
                <Image
                  src={image}
                  alt={`${product.name} - Image ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/placeholder-product.png';
                  }}
                />
              </div>
            ))
          ) : (
            <div className="relative w-full h-full">
              <Image
                src="/placeholder-product.png"
                alt={product.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
              />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant={platformColor} className="capitalize">
            {product.platform}
          </Badge>
          {product.supplier.verification.length > 0 && (
            <Badge variant="outline" className="text-xs">
              {product.supplier.verification[0]}
            </Badge>
          )}
        </div>
        <h3 className="font-semibold text-sm line-clamp-2 mb-2 min-h-[2.5rem]">
          {product.name}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
          {product.supplier.name}
        </p>
        {product.price && (
          <p className="text-sm font-bold text-primary">
            {product.price}
            {product.currency && ` ${product.currency}`}
          </p>
        )}
        {product.moq && (
          <p className="text-xs text-muted-foreground mt-1">
            {product.moq}
          </p>
        )}
      </CardContent>
      <CardFooter className="p-4 pt-0 text-xs text-muted-foreground flex items-center gap-1">
        <MapPin className="h-3 w-3" />
        {product.supplier.location || 'Location unknown'}
      </CardFooter>
    </Card>
  );
}
