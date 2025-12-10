import { UnifiedProduct } from '../types';
import { MICCompany, MICProductSummary, MICSearchResponse } from './types';

const PLATFORM = 'madeinchina' as const;

export function mapMICToUnified(response: MICSearchResponse): UnifiedProduct[] {
  return (response.companies ?? [])
    .filter((company): company is MICCompany => Boolean(company?.companyId))
    .map((company) => mapCompanyToProduct(company));
}

function mapCompanyToProduct(company: MICCompany): UnifiedProduct {
  const verification = buildVerificationBadges(company);
  const images = buildImageCollection(company);
  const description = company.mainProducts?.slice(0, 3).join(', ') || undefined;

  return {
    id: `${PLATFORM}-${company.companyId}`,
    platform: PLATFORM,
    name: company.companyName,
    description,
    price: null,
    currency: null,
    moq: null,
    images,
    supplier: {
      id: company.companyId,
      name: company.companyName,
      location: formatLocation(company.city, company.province),
      verification,
    },
    url: normalizeUrl(company.companyUrl, 'https://www.made-in-china.com'),
    platformSpecific: buildPlatformSpecific(company),
  };
}

function buildImageCollection(company: MICCompany): string[] {
  const summaryImages = (company.productList ?? [])
    .map((product) => product.image)
    .filter((value): value is string => Boolean(value));

  const images = [company.companyLogoUrl, ...company.productImages, ...summaryImages]
    .filter((value): value is string => Boolean(value))
    .map((value) => normalizeUrl(value, 'https://www.made-in-china.com'));

  return Array.from(new Set(images));
}

function buildVerificationBadges(company: MICCompany): string[] {
  const badges: string[] = [];

  if (company.isAuditedSupplier) badges.push('Audited Supplier');
  if (typeof company.capabilityStars === 'number' && company.capabilityStars > 0) {
    badges.push(`${company.capabilityStars} Stars`);
  }

  if (company.certifications) {
    const certificationBadges = company.certifications
      .split(/[,|]/)
      .map((value) => value.trim())
      .filter(Boolean);
    badges.push(...certificationBadges);
  }

  return badges;
}

function formatLocation(city?: string | null, province?: string | null): string | undefined {
  if (!city && !province) return undefined;
  if (city && province) return `${city}, ${province}`;
  return city ?? province ?? undefined;
}

function buildPlatformSpecific(company: MICCompany): Record<string, unknown> {
  return {
    businessType: company.businessType,
    mainProducts: company.mainProducts,
    inquiryUrl: company.inquiryUrl,
    chatId: company.chatId,
    productList: company.productList,
    productImages: company.productImages,
  };
}

function normalizeUrl(url?: string | null, base?: string): string {
  if (!url) return base ?? '';
  const trimmed = url.trim();
  if (trimmed.startsWith('http')) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  if (trimmed.startsWith('/')) return `${base ?? ''}${trimmed}`;
  return trimmed;
}
