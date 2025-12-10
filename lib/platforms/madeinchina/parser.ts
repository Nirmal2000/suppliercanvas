import { Cheerio, CheerioAPI, load } from 'cheerio';
import type { Element } from 'domhandler';

import { MICCompany, MICProductSummary, MICSearchResponse } from './types';

const PLATFORM_BASE_URL = 'https://www.made-in-china.com';

export function parseMICHTML(html: string, keyword: string, page: number): MICSearchResponse {
  const $ = load(html);
  const companies: MICCompany[] = [];

  $('.list-node').each((index, element) => {
    const company = extractCompany($, element as Element, index);
    if (company) {
      companies.push(company);
    }
  });

  const totalCount = extractTotalCount($);

  return {
    success: true,
    keyword,
    page,
    totalCount: typeof totalCount === 'number' ? totalCount : undefined,
    companies,
  };
}

function extractCompany($: CheerioAPI, element: Element, index: number): MICCompany | null {
  const container = $(element);
  const companyLink = container.find('h2.company-name a').first();
  const companyName = companyLink.text().trim();

  if (!companyName) {
    return null;
  }

  const companyUrl = normalizeUrl(companyLink.attr('href')) || PLATFORM_BASE_URL;
  const companyId =
    extractCompanyId(companyLink.attr('ads-data')) ??
    `mic-${companyName.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}-${index}`;

  const { city, province } = extractLocation($, container);
  const mainProducts = extractMainProducts($, container);
  const businessType = extractBusinessType($, container);
  const certificationText = extractCertifications($, container);
  const capabilityStars = extractCapabilityStars(container);
  const isAuditedSupplier = hasAuditedBadge(container);
  const inquiryUrl = normalizeUrl(container.find('a.contact-btn').first().attr('href')) || null;
  const chatId = container.find('b.tm3_chat_status').attr('cid') || null;
  const productList = extractProducts($, container);
  const productImages = Array.from(new Set(productList.map((product) => product.image).filter(Boolean))) as string[];
  const normalizedImages = productImages
    .map((image) => normalizeUrl(image))
    .filter((value): value is string => Boolean(value));

  const company: MICCompany = {
    companyName,
    companyUrl,
    companyId,
    businessType,
    mainProducts,
    city,
    province,
    isAuditedSupplier,
    capabilityStars,
    certifications: certificationText,
    companyLogoUrl: null,
    inquiryUrl,
    chatId,
    productList,
    productImages: normalizedImages,
  };

  return company;
}

function extractTotalCount($: CheerioAPI): number | undefined {
  const totalAttribute =
    $('[data-total]').first().attr('data-total') ??
    $('[data-result-total]').first().attr('data-result-total') ??
    $('[data-result-count]').first().attr('data-result-count');

  if (totalAttribute) {
    const normalized = Number(totalAttribute.replace(/,/g, ''));
    if (!Number.isNaN(normalized)) {
      return normalized;
    }
  }

  const totalText = $('.company-total, .result-number').first().text();
  if (totalText) {
    const digits = totalText.replace(/[^0-9]/g, '');
    if (digits) {
      return Number(digits);
    }
  }

  return undefined;
}

function extractCompanyId(adsData?: string): string | null {
  if (!adsData) return null;
  const match = adsData.match(/pcid:([A-Za-z0-9]+)/);
  return match?.[1] ?? null;
}

function extractLocation($: CheerioAPI, container: Cheerio<Element>): { city?: string; province?: string } {
  let city: string | undefined;
  let province: string | undefined;

  container.find('.company-intro tr').each((_, row) => {
    const rowEl = $(row);
    const cells = rowEl.find('td');
    if (cells.length < 2) return;

    const label = $(cells[0]).text().trim().toLowerCase();
    const value = $(cells[1]).text().trim();

    if (label.startsWith('city/province')) {
      const [cityValue, provinceValue] = value.split(/[,|]/).map((part) => part.trim());
      if (cityValue) city = cityValue;
      if (provinceValue) province = provinceValue;
    }
  });

  return { city, province };
}

function extractBusinessType($: CheerioAPI, container: Cheerio<Element>): string | null {
  let businessType: string | null = null;

  container.find('.company-intro tr').each((_, row) => {
    const rowEl = $(row);
    const cells = rowEl.find('td');
    if (cells.length < 2) return;

    const label = $(cells[0]).text().trim().toLowerCase();
    if (label.startsWith('business type')) {
      businessType = $(cells[1]).text().trim() || null;
    }
  });

  return businessType;
}

function extractMainProducts($: CheerioAPI, container: Cheerio<Element>): string[] {
  let products: string[] = [];

  container.find('.company-intro tr').each((_, row) => {
    const rowEl = $(row);
    const cells = rowEl.find('td');
    if (cells.length < 2) return;

    const label = $(cells[0]).text().trim().toLowerCase();
    if (label.startsWith('main products')) {
      const value = $(cells[1]).text().trim();
      products = value
        .split(/[,|]/)
        .map((item) => item.trim())
        .filter(Boolean);
    }
  });

  return products;
}

function extractCapabilityStars(container: Cheerio<Element>): number | null {
  const starImages = container.find('.auth-icon-list .icon-star img');
  if (!starImages.length) return null;

  const filledStars = starImages.filter((_, img) => {
    const src = (img as Element).attribs?.src || '';
    return !/gray/i.test(src);
  }).length;

  return filledStars || null;
}

function hasAuditedBadge(container: Cheerio<Element>): boolean {
  return container.find('.auth-icon-list .as-logo, .auth-icon-list .icon-audited').length > 0;
}

function extractCertifications($: CheerioAPI, container: Cheerio<Element>): string | null {
  const texts = container
    .find('.auth-icon-list .icon-text')
    .map((_, el) => $(el).text().trim())
    .get()
    .filter(Boolean);

  if (!texts.length) return null;
  return texts.join(', ');
}

function extractProducts($: CheerioAPI, container: Cheerio<Element>): MICProductSummary[] {
  const products: MICProductSummary[] = [];

  container.find('ul.rec-product li').each((_, item) => {
    const productContainer = $(item);
    const linkElement = productContainer.find('.img-thumb a, .pro-name a').first();
    const url = normalizeUrl(linkElement.attr('href'));
    const name = productContainer.find('.pro-name a').text().trim() || linkElement.text().trim();
    if (!url) return;

    const imageSource = productContainer.find('img').attr('data-original') ?? productContainer.find('img').attr('src');

    products.push({
      name: name || 'Product',
      url,
      image: imageSource ? normalizeUrl(imageSource) : undefined,
    });
  });

  return products;
}

function normalizeUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http')) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  if (trimmed.startsWith('/')) return `${PLATFORM_BASE_URL}${trimmed}`;
  if (trimmed.startsWith('javascript:')) return '';
  return trimmed;
}
