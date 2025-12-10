export interface MICSearchResponse {
  success: boolean;
  keyword: string;
  page: number;
  totalCount?: number | string;
  companies: MICCompany[];
}

export interface MICCompany {
  companyName: string;
  companyUrl: string;
  companyId: string;
  businessType?: string | null;
  mainProducts: string[];
  city?: string | null;
  province?: string | null;
  isAuditedSupplier?: boolean;
  capabilityStars?: number | null;
  certifications?: string | null;
  companyLogoUrl?: string | null;
  inquiryUrl?: string | null;
  chatId?: string | null;
  productList: MICProductSummary[];
  productImages: string[];
}

export interface MICProductSummary {
  name: string;
  url: string;
  image?: string;
}
