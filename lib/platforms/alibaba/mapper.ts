import { UnifiedProduct } from '../types';
import { AlibabaOffer, AlibabaSearchResponse } from './types';

const PLATFORM = 'alibaba' as const;

export function mapAlibabaToUnified(response: AlibabaSearchResponse): UnifiedProduct[] {
  const offers = response?.model?.offers ?? [];

  return offers
    .filter((offer): offer is AlibabaOffer => Boolean(offer?.companyId))
    .map((offer) => mapOfferToProduct(offer));
}

function mapOfferToProduct(offer: AlibabaOffer): UnifiedProduct {
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
