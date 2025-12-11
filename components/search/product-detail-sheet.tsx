'use client';

import { UnifiedSupplier } from '@/lib/platforms/types';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import {
  MapPin,
  ExternalLink,
  Package,
  DollarSign,
  Star,
  Award,
  CheckCircle2,
  TrendingUp,
  MessageSquare,
  Building2,
} from 'lucide-react';
import { useState } from 'react';

interface ProductDetailSheetProps {
  product: UnifiedSupplier | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductDetailSheet({
  product,
  open,
  onOpenChange,
}: ProductDetailSheetProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  if (!product) return null;

  // Platform-specific data handling
  const platformColor = product.platform === 'alibaba' ? 'default' : 'secondary';
  const currentImage = product.images[selectedImageIndex] || '/placeholder-product.png';

  // Alibaba-specific data
  const alibabaData = product.platform === 'alibaba'
    ? (product.platformSpecific as {
      reviewScore?: string;
      reviewCount?: number;
      onTimeDelivery?: string;
      replyAvgTime?: string;
      reorderRate?: string;
      onlineRevenue?: string;
      mainProducts?: Array<{ name: string; count: number | null }>;
      products?: Array<{
        productId: string;
        productImg: string;
        price: string;
        moq: string;
        action: string;
      }>;
    })
    : null;

  // Made-in-China-specific data
  const micData = product.platform === 'madeinchina'
    ? (product.platformSpecific as {
      mainProducts?: string[];
      certifications?: string;
      capabilityStars?: number;
      productList?: string[];
      inquiryUrl?: string;
    })
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-2xl pr-8">{product.name}</SheetTitle>
          <SheetDescription>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={platformColor} className="capitalize">
                {product.platform}
              </Badge>
              {product.supplier.verification.map((badge, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {badge}
                </Badge>
              ))}
            </div>
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Image Gallery */}
          {product.images.length > 0 && (
            <div className="space-y-3">
              <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
                <Image
                  src={currentImage}
                  alt={product.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/placeholder-product.png';
                  }}
                />
              </div>
              {product.images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={`relative flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border-2 transition-colors ${idx === selectedImageIndex
                        ? 'border-primary'
                        : 'border-transparent hover:border-muted-foreground'
                        }`}
                    >
                      <Image
                        src={img}
                        alt={`${product.name} - Image ${idx + 1}`}
                        fill
                        className="object-cover"
                        sizes="80px"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/placeholder-product.png';
                        }}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Price and MOQ */}
          {(product.price || product.moq) && (
            <div className="grid grid-cols-2 gap-4">
              {product.price && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                  <DollarSign className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Price</p>
                    <p className="text-lg font-bold">
                      {product.price}
                      {product.currency && ` ${product.currency}`}
                    </p>
                  </div>
                </div>
              )}
              {product.moq && (
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                  <Package className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">MOQ</p>
                    <p className="text-sm font-semibold">{product.moq}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Product Description */}
          {product.description && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Package className="h-4 w-4" />
                Description
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {product.description}
              </p>
            </div>
          )}

          {/* Product Specifications (Attributes) */}
          {product.products.length > 0 && product.products[0].attributes && Object.keys(product.products[0].attributes).length > 0 && (
            <div className="space-y-3 p-4 rounded-lg bg-muted/30">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Package className="h-4 w-4" />
                Specifications
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {Object.entries(product.products[0].attributes).map(([key, value]) => (
                  <div key={key} className="flex justify-between border-b border-border/50 pb-1 last:border-0">
                    <span className="text-muted-foreground">{key}</span>
                    <span className="font-medium text-right">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Supplier Information */}
          <div className="space-y-3 p-4 rounded-lg bg-muted/30">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Supplier Information
            </h3>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-muted-foreground">Company Name</p>
                <p className="font-medium">{product.supplier.name}</p>
              </div>
              {product.supplier.location && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  {product.supplier.location}
                </div>
              )}
              {product.supplier.verification.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Verification</p>
                  <div className="flex flex-wrap gap-1">
                    {product.supplier.verification.map((badge, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {badge}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Platform-Specific Data: Alibaba */}
          {alibabaData && (
            <div className="space-y-3 p-4 rounded-lg bg-muted/30">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Alibaba Performance Metrics
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {alibabaData.reviewScore && (
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Review Score</p>
                      <p className="text-sm font-semibold">{alibabaData.reviewScore}</p>
                    </div>
                  </div>
                )}
                {alibabaData.reviewCount !== undefined && (
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-blue-500" />
                    <div>
                      <p className="text-xs text-muted-foreground">Reviews</p>
                      <p className="text-sm font-semibold">{alibabaData.reviewCount}</p>
                    </div>
                  </div>
                )}
                {alibabaData.onTimeDelivery && (
                  <div>
                    <p className="text-xs text-muted-foreground">On-Time Delivery</p>
                    <p className="text-sm font-semibold">{alibabaData.onTimeDelivery}</p>
                  </div>
                )}
                {alibabaData.replyAvgTime && (
                  <div>
                    <p className="text-xs text-muted-foreground">Reply Time</p>
                    <p className="text-sm font-semibold">{alibabaData.replyAvgTime}</p>
                  </div>
                )}
                {alibabaData.reorderRate && (
                  <div>
                    <p className="text-xs text-muted-foreground">Reorder Rate</p>
                    <p className="text-sm font-semibold">{alibabaData.reorderRate}</p>
                  </div>
                )}
                {alibabaData.onlineRevenue && (
                  <div>
                    <p className="text-xs text-muted-foreground">Online Revenue</p>
                    <p className="text-sm font-semibold">{alibabaData.onlineRevenue}</p>
                  </div>
                )}
              </div>
              {alibabaData.mainProducts && alibabaData.mainProducts.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-muted-foreground mb-2">Main Products</p>
                  <div className="flex flex-wrap gap-1">
                    {alibabaData.mainProducts.map((prod, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {prod.name}
                        {prod.count !== null && ` (${prod.count})`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Platform-Specific Data: Made-in-China */}
          {micData && (
            <div className="space-y-3 p-4 rounded-lg bg-muted/30">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Award className="h-4 w-4" />
                Made-in-China Information
              </h3>
              <div className="space-y-2">
                {micData.capabilityStars !== undefined && micData.capabilityStars > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {Array.from({ length: micData.capabilityStars }).map((_, idx) => (
                        <Star key={idx} className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                      ))}
                    </div>
                    <p className="text-sm font-semibold">Capability Rating</p>
                  </div>
                )}
                {micData.certifications && (
                  <div>
                    <p className="text-xs text-muted-foreground">Certifications</p>
                    <p className="text-sm">{micData.certifications}</p>
                  </div>
                )}
                {micData.mainProducts && micData.mainProducts.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Main Products</p>
                    <div className="flex flex-wrap gap-1">
                      {micData.mainProducts.map((prod, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {prod}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Link to Source Platform */}
          <div className="pt-4 border-t">
            <Button
              asChild
              className="w-full"
              size="lg"
            >
              <a
                href={product.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2"
              >
                View on {product.platform === 'alibaba' ? 'Alibaba' : 'Made-in-China'}
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
