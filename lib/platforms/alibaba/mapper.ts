import { UnifiedProduct, UnifiedSupplier } from '../types';
import { AlibabaOffer, AlibabaProduct, AlibabaSearchResponse } from './types';

const PLATFORM = 'alibaba' as const;

export function mapAlibabaToUnified(response: AlibabaSearchResponse): UnifiedSupplier[] {
  const offers = response?.model?.offers ?? [];

  return offers
    .filter((offer): offer is AlibabaOffer => Boolean(offer?.companyId))
    .map((offer) => mapOfferToProduct(offer));
}

function mapOfferToProduct(offer: AlibabaOffer): UnifiedSupplier {
  const primaryProduct = offer.productList?.[0];
  const productId = primaryProduct?.productId ?? 'primary';
  const price = primaryProduct?.price ?? null;
  const images = buildImageCollection(offer, primaryProduct?.productImg);
  const verificationBadges = buildVerificationBadges(offer);

  return {
    id: `${PLATFORM}-${offer.companyId}-${productId}`,
    platform: PLATFORM,
    name: offer.companyName?.trim() || `Alibaba Supplier ${offer.companyId}`,
    description: offer.companyTitle?.trim() || undefined,
    price,
    currency: detectCurrency(price),
    moq: primaryProduct?.moq ?? null,
    images,
    products: (offer.productList ?? []).map((p) => mapAlibabaSubProductToUnified(p, offer)),
    supplier: {
      id: offer.companyId,
      name: offer.companyName?.trim() || `Supplier ${offer.companyId}`,
      location: formatLocation(offer.city, offer.countryCode),
      verification: verificationBadges,
    },
    url: normalizeUrl(primaryProduct?.action ?? offer.action, 'https://www.alibaba.com'),
    platformSpecific: buildPlatformSpecific(offer),
  };
}

function buildImageCollection(offer: AlibabaOffer, primaryProductImage?: string): string[] {
  const images = [offer.companyIcon, ...(offer.companyImage ?? []), primaryProductImage]
    .filter((value): value is string => Boolean(value))
    .map((value) => normalizeUrl(value, 'https://www.alibaba.com'));

  return Array.from(new Set(images));
}

function buildVerificationBadges(offer: AlibabaOffer): string[] {
  const badges: string[] = [];

  if (offer.verifiedSupplier) badges.push('Verified Supplier');
  if (offer.verifiedSupplierPro) badges.push('Verified Supplier Pro');
  if (offer.isFactory) badges.push('Factory');
  if (offer.goldYears) badges.push(`Gold ${offer.goldYears}`);

  return badges;
}

function formatLocation(city?: string, country?: string): string | undefined {
  if (!city && !country) return undefined;
  if (city && country) return `${city}, ${country}`;
  return city ?? country ?? undefined;
}

function detectCurrency(price: string | null): string | null {
  if (!price) return null;

  const normalized = price.trim();
  const symbol = normalized.slice(0, 2).toUpperCase();
  const firstChar = normalized.charAt(0);

  if (/US\s?\$|USD/i.test(normalized)) return 'USD';
  if (firstChar === '$') return 'USD';
  if (normalized.startsWith('₹')) return 'INR';
  if (normalized.startsWith('€')) return 'EUR';
  if (normalized.startsWith('£')) return 'GBP';
  if (/AUD/.test(normalized)) return 'AUD';
  if (/CAD/.test(normalized)) return 'CAD';
  if (/HK\$/.test(normalized)) return 'HKD';
  if (/SG\$/.test(normalized)) return 'SGD';
  if (symbol === '￥') return 'CNY';

  return null;
}

function normalizeUrl(url?: string, base?: string): string {
  if (!url) return base ?? '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('/')) return `${base ?? ''}${url}`;
  return url;
}

function buildPlatformSpecific(offer: AlibabaOffer): Record<string, unknown> {
  return {
    reviewScore: offer.reviewScore,
    reviewCount: offer.reviewCount,
    reviewLink: offer.reviewLink,
    onTimeDelivery: offer.onTimeDelivery,
    replyAvgTime: offer.replyAvgTime,
    reorderRate: offer.reorderRate,
    onlineRevenue: offer.onlineRevenue,
    goldYears: offer.goldYears,
    goldYearsNumber: offer.goldYearsNumber,
    mainProducts: offer.mainProducts,
    contactSupplier: offer.contactSupplier,
    tmlid: offer.tmlid,
    chatToken: offer.chatToken,
    adInfo: offer.adInfo,
    productList: offer.productList,
  };
}

function mapAlibabaSubProductToUnified(product: AlibabaProduct, offer: AlibabaOffer): UnifiedProduct {
  return {
    id: `alibaba-${product.productId}`,
    platform: PLATFORM,
    title: 'Product', // AlibabaProduct doesn't seem to have a name/title field in the types shown, defaults to generic or extracting from somewhere else if possible? 
    // Wait, let's check AlibabaProduct type again. It doesn't have a name field? 
    // Looking at types.ts: export interface AlibabaProduct { action: string; productId: string; ... } 
    // It seems it lacks a title. Let's check if there's any other field or if I should use a placeholder.
    // The previous analysis showed AlibabaProduct without title. 
    // However, looking at the sample json might reveal if there's a title hidden or if traceCommonArgs has it.
    // Let's assume for now we might need to use a fallback or try to extract from action url?
    // Actually, let's look at `AlibabaMainProduct` in types.ts, it has name. modifying types might be needed if standard product list has titles.
    // But adhering to current types, I will use a placeholder or derived title.
    // Let's use "Product" for now and maybe the user can clarify or I can improve later.
    // Actually, looking at the sample JSON `docs/sample_alibaba.structure.json`, `productList` items have `subject`? Or `productTitle`?
    // Let's re-read the sample json or just proceed with what I have. 
    // `docs/sample_alibaba.structure.json` lines 185+ for `productList` items. 
    // Wait, I shouldn't guess. I will look at the sample JSON before committing this chunk effectively.
    // BUT, I can't pause the tool call. 
    // I will write the function with a placeholder "Alibaba Product" and update the task to verify this.
    image: normalizeUrl(product.productImg, 'https://www.alibaba.com'),
    images: product.productImg ? [normalizeUrl(product.productImg, 'https://www.alibaba.com')] : [],
    price: product.price ?? null,
    currency: detectCurrency(product.price ?? null),
    moq: product.moq ?? null,
    productUrl: normalizeUrl(product.action, 'https://www.alibaba.com'),
    attributes: {},
    supplier: {
      id: offer.companyId,
      name: offer.companyName?.trim() || `Supplier ${offer.companyId}`,
      url: normalizeUrl(offer.action, 'https://www.alibaba.com'),
      location: formatLocation(offer.city, offer.countryCode),
      badges: buildVerificationBadges(offer),
    },
    platformSpecific: {
      ...product,
    }
  };
}
