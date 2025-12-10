  Alibaba Supplier Search API Specification

  Base Endpoint

  GET https://www.alibaba.com/search/api/supplierTextSearch

  Query Parameters

  | Parameter             | Type    | Example                     | Description                 |
  |-----------------------|---------|-----------------------------|-----------------------------|
  | productQpKeywords     | string  | "vacuum cleaner"            | Product keyword             |
  | queryProduct          | string  | "vacuum cleaner"            | Query product term          |
  | supplierQpKeywords    | string  | "vacuum cleaner"            | Supplier keyword            |
  | supplierQpProductName | string  | "vacuum cleaner"            | Supplier product name       |
  | productName           | string  | "vacuum cleaner"            | Product name                |
  | queryRaw              | string  | "vacuum cleaner"            | Raw query                   |
  | query                 | string  | "vacuum cleaner"            | General query               |
  | queryMachineTranslate | string  | "vacuum cleaner"            | Machine translated query    |
  | pageSize              | integer | 20                          | Results per page (fixed)    |
  | page                  | integer | 1                           | Page number                 |
  | from                  | string  | "pcHomeContent"             | Source identifier           |
  | langident             | string  | "en"                        | Language (en/zh-CN)         |
  | verifiedManufactory   | string  | "true"                      | Verified factories only     |
  | pro                   | string  | "true"                      | Professional suppliers only |
  | productAttributes     | string  | ""                          | Product attributes filter   |
  | intention             | string  | ""                          | Business intention filter   |
  | supplierAttributes    | string  | ""                          | Supplier attributes filter  |
  | requestId             | string  | "AI_Web_[UUID]_[TIMESTAMP]" | Dynamic request ID          |
  | startTime             | integer | 1734000000000               | Request timestamp (ms)      |

  ---
  Response Structure

  {
    "success": boolean,
    "model": {
      "offers": [
        {
          // Company/Supplier Info
          "companyId": "281906743",
          "companyName": "Foshan Maotong Home Furnishing Technology Co., Ltd.",
          "companyTitle": "Foshan Maotong Home Furnishing Technology Co., Ltd.",
          "action": "//mouton.en.alibaba.com/company_profile.html",
          "countryCode": "CN",
          "city": "Guangdong Province",

          // Icons & Images
          "companyIcon": "https://img.alicdn.com/imgextra/i3/O1CN01XjALuQ1QCZ6OKrA9X_!!6000000001940-2-tps-84-84.png",
          "companyImage": [
            "https://s.alicdn.com/@sc04/kf/H822fb9e3805c49e59b51ea1b33911004L.jpg_640x640.jpg",
            "https://s.alicdn.com/@sc04/kf/H8d340db8223040ce846f68e711ec60c4n.jpg_640x640.jpg",
            "https://s.alicdn.com/@sc04/kf/H8311f93e562f43a0966fdaadd6b69d378.jpg_640x640.jpg"
          ],

          // Verification Status
          "verifiedSupplier": false,
          "verifiedSupplierPro": false,
          "isFactory": false,

          // Ratings & Reviews
          "reviewScore": "4.7",
          "reviewCount": 22,
          "reviewLink": "//mouton.en.alibaba.com/company_profile/feedback.html",

          // Performance Metrics
          "onTimeDelivery": "87%",
          "replyAvgTime": "≤2h",
          "reorderRate": "<15%",
          "onlineRevenue": "US $20,000+",

          // Gold Member Info
          "goldYearsNumber": "2",
          "goldYears": "2 yrs",

          // Main Products
          "mainProducts": [
            {
              "name": "Living Room Sofas",
              "count": null
            },
            {
              "name": "Mattresses",
              "count": null
            }
          ],

          // Detailed Product List
          "productList": [
            {
              "action": "//www.alibaba.com/product-detail/Modern-Eco-Friendly-Modular-Couch-Sofa_1601496778544.html",
              "productId": "1601496778544",
              "productImg": "https://s.alicdn.com/@sc04/kf/H73ce2bcc2e92490b870867e38b296197g.jpg_300x300.jpg",
              "price": "₹7,704.35-25,589.44",
              "moq": "Min. order: 2 pieces",
              "cateId": "201723201",
              "itemType": null,
              "traceCommonArgs": {
                "productId": "1601496778544",
                "companyId": 281906743,
                "is_customizable": "false",
                "item_type": "newad",
                "showAd": "true",
                "is_half_trust_instant_order": "false"
              }
            }
          ],

          // Contact & Messaging
          "contactSupplier": "//message.alibaba.com/msgsend/contact.htm?...",
          "tmlid": "8pctgRBMALMc0sHykKZwWB94ezCO0zYJ",
          "chatToken": "RWRIaHZYd0dEaGQxU2FpNitNWmRqYjNla2xRc2duTmp6NTdWbm9ISm9vVy9xUWRNR3NIU0h0MnZZdU5qRzFaMWUrUDZ0Wm9POTJGNlppREtXdmJ6OTJ4
  YW5nUm5ab0xLSEExZklXUGhQKytMMndDdkxOZUdnSEp5VHdHbWJ3Wi9jZGNrUlIwS2N1S20vRVAxRDl2UmlBPT0mdmVyc2lvbj0xLjAuMA==",

          // Advertising Data
          "newAd": true,
          "adInfo": {
            "campaignType": "26",
            "campaignId": "351999270",
            "adgroupId": "12164008750",
            "templateId": "2000000250",
            "creativeId": "13767783004680001",
            "elementScene": false,
            "immersion": false,
            "creativeInfo": {
              "viewProfileText": "View profile",
              "tpText": "Top sponsor listing",
              "mainProduct": { /* Product details */ },
              "products": [ /* Multiple products */ ]
            }
          }
        }
      ],
      "totalCount": 50000  // Estimated total suppliers
    }
  }

  ---
  Key Field Descriptions

  Company Information

  - companyId: Unique supplier ID
  - companyName: Full company name
  - companyTitle: Display title (often same as name)
  - action: Link to company profile
  - countryCode: ISO country code (e.g., "CN")
  - city: Location/city

  Verification Status

  - verifiedSupplier: Gold Supplier status
  - verifiedSupplierPro: Pro supplier status
  - isFactory: Certified factory status
  - goldYearsNumber: Years as gold member
  - goldYears: Human-readable gold member duration

  Performance Metrics

  - reviewScore: 0-5 rating (string)
  - reviewCount: Number of reviews
  - onTimeDelivery: On-time delivery percentage
  - replyAvgTime: Average response time (≤2h, ≤4h, etc.)
  - reorderRate: Customer reorder rate percentage
  - onlineRevenue: Annual online revenue range

  Images (YES, images ARE returned)

  - companyIcon: Logo URL (84x84px)
  - companyImage: Array of banner/showcase images (640x640px)
  - Each product has productImg: Thumbnail (300x300px)

  Products

  - mainProducts: Top 5-6 product categories the supplier specializes in
  - productList: Array of 10+ specific products with:
    - Product title and image
    - Price range
    - Minimum order quantity (MOQ)
    - Product ID and category ID
    - Direct product detail link

  Ad Information

  - newAd: Marked as sponsored/advertisement
  - adInfo: Advertising metadata (campaign ID, creative ID, etc.)
  - Includes rich creative info with multiple product showcases

  ---
  Summary

  | Aspect                    | Details                                     |
  |---------------------------|---------------------------------------------|
  | Total Fields per Supplier | 40+ fields                                  |
  | Images Included?          | ✅ YES (icons, banners, product images)      |
  | Products per Supplier     | 10-15 in productList                        |
  | Main Product Categories   | 5-6 categories                              |
  | Results per Page          | 20 fixed                                    |
  | Max Pagination            | Unlimited pages                             |
  | Performance Data          | Ratings, reviews, delivery %, response time |
  | Contact Info              | Chat tokens, contact URLs included          |
  | Advertising               | Detailed ad metadata included               |