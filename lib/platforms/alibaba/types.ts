export interface AlibabaSearchResponse {
  success: boolean;
  model?: {
    offers?: AlibabaOffer[];
    totalCount?: number;
    page?: number;
    pageSize?: number;
  };
  error?: string;
}

export interface AlibabaOffer {
  companyId: string;
  companyName: string;
  companyTitle?: string;
  action: string;
  countryCode?: string;
  city?: string;
  companyIcon?: string;
  companyImage?: string[];
  verifiedSupplier?: boolean;
  verifiedSupplierPro?: boolean;
  isFactory?: boolean;
  reviewScore?: string;
  reviewCount?: number;
  reviewLink?: string;
  onTimeDelivery?: string;
  replyAvgTime?: string;
  reorderRate?: string;
  onlineRevenue?: string;
  goldYearsNumber?: string;
  goldYears?: string;
  mainProducts?: AlibabaMainProduct[];
  productList?: AlibabaProduct[];
  contactSupplier?: string;
  tmlid?: string;
  chatToken?: string;
  newAd?: boolean;
  adInfo?: AlibabaAdInfo;
}

export interface AlibabaMainProduct {
  name: string;
  count?: number | null;
}

export interface AlibabaProduct {
  action: string;
  productId: string;
  productImg?: string;
  price?: string;
  moq?: string;
  cateId?: string;
  itemType?: string | null;
  traceCommonArgs?: AlibabaTraceCommonArgs;
}

export interface AlibabaTraceCommonArgs {
  productId?: string;
  companyId?: number | string;
  is_customizable?: string;
  item_type?: string;
  showAd?: string;
  is_half_trust_instant_order?: string;
  [key: string]: string | number | undefined;
}

export interface AlibabaAdInfo {
  campaignType?: string;
  campaignId?: string;
  adgroupId?: string;
  templateId?: string;
  creativeId?: string;
  elementScene?: boolean;
  immersion?: boolean;
  creativeInfo?: AlibabaAdCreativeInfo;
}

export interface AlibabaAdCreativeInfo {
  viewProfileText?: string;
  tpText?: string;
  mainProduct?: AlibabaProduct;
  products?: AlibabaProduct[];
  [key: string]: unknown;
}
