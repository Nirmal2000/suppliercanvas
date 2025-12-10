 Made-in-China Supplier Search API Specification (COMPLETE)

  Step 1: HTTP Request (Fetch HTML)

  GET https://www.made-in-china.com/company-search/{keyword}/C1/{page}.html

  Query Parameters

  | Parameter | Type    | Example           | Description                                 |
  |-----------|---------|-------------------|---------------------------------------------|
  | {keyword} | string  | compressible+sofa | Search keyword (spaces as + or URL-encoded) |
  | C1        | string  | C1                | Category (fixed)                            |
  | {page}    | integer | 1                 | Page number (1-N)                           |

  Headers Required

  User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36
  Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8
  Accept-Language: en-US,en;q=0.5
  Referer: https://www.made-in-china.com/

  ---
  Step 2: Parse HTML Response

  Each listing is wrapped in a <div class="list-node"> element with these extractable fields:

  Complete HTML Structure

  <div faw-module="suppliers_list" class="list-node">
    <!-- Company Header -->
    <h2 class="company-name">
      <a href="//ailinsofa.en.made-in-china.com" 
         ads-data="pcid:PBkGYzgbCcVN,...">
        Guangzhou Ailin Home Technology Co., LTD
      </a>
    </h2>

    <!-- Company Info Section -->
    <div class="company-info">
      <div class="company-box">

        <!-- STAR RATINGS (Supplier Capability Index) -->
        <li class="auth-icon-list">
          <span class="auth-icon-item icon-star">
            <img src="...star-light.png"/>    <!-- 1 star -->
            <img src="...star-light.png"/>    <!-- 2 stars -->
            <img src="...star-gray.png"/>     <!-- 0 stars (unfilled) -->
          </span>
        </li>

        <!-- Company Details Table -->
        <table class="company-intro">
          <tr>
            <td class="subject">Main Products:</td>
            <td>Sofa, Compressed Sofa, Living Room Sofa, ...</td>
          </tr>
          <tr>
            <td class="subject">City/Province:</td>
            <td>Foshan, Guangdong</td>
          </tr>
        </table>

        <!-- Contact Actions -->
        <div class="user-action">
          <!-- Contact Now Button -->
          <a class="contact-btn" 
             href="https://www.made-in-china.com/sendInquiry/...">
            Contact Now
          </a>

          <!-- Chat Status (hidden) -->
          <b class="tm3_chat_status" 
             dataId="PBkGYzgbCcVN_PBkGYzgbCcVN_3"
             inquiry="https://www.made-in-china.com/sendInquiry/..."
             processor="chat"
             cid="PBkGYzgbCcVN">
          </b>

          <!-- Inquiry Basket -->
          <span class="add-to-basket com-PBkGYzgbCcVN">
            <a href="javascript:add2BasketCom('com-PBkGYzgbCcVN','$com.comLogoPhotoUrl')">
              Inquiry Basket
            </a>
          </span>
        </div>

      </div>
    </div>

    <!-- PRODUCT LIST (3-5 products shown) -->
    <ul class="rec-product">
      <li>
        <!-- Product Image -->
        <div class="img-thumb">
          <a href="//ailinsofa.en.made-in-china.com/product/SpXUgwZuLlWD/...">
            <img alt="Product Title"
                 data-original="https://image.made-in-china.com/2f1j00yFLVGhNZMsRb/Product.jpg"
                 faw-exposure/>
          </a>
        </div>

        <!-- Product Name -->
        <div class="pro-name">
          <a href="...">Modern Compressible Sofa Bed...</a>
        </div>
      </li>
      <!-- More products... -->
    </ul>
  </div>

  ---
  Step 3: Extracted Fields (Complete List)

  | Field             | HTML Source                              | Type       | Example
                       | Notes                                    |
  |-------------------|------------------------------------------|------------|-------------------------------------------------------------
  ---------------------|------------------------------------------|
  | companyName       | <h2 class="company-name"><a> text        | string     | "Guangzhou Ailin Home Technology Co., LTD"
                       | -                                        |
  | companyUrl        | <h2 class="company-name"><a href>        | string     | "https://ailinsofa.en.made-in-china.com"                    
                       | Prepend https: to protocol-relative URLs |
  | companyId         | <a ads-data="pcid:..." (regex extract)   | string     | "PBkGYzgbCcVN"
                       | Extracted from ads-data attribute        |
  | businessType      | <table><tr><td>Business Type</td>        | string     | null
                       | Not always present in visible HTML       |
  | mainProducts      | <table><tr><td>Main Products</td><td>    | JSON array | ["Sofa", "Compressed Sofa", ...]
                       | Comma-separated, cleaned & split         |
  | city              | <table><tr><td>City/Province</td><td>    | string     | "Foshan"
                       | First part before comma                  |
  | province          | <table><tr><td>City/Province</td><td>    | string     | "Guangdong"
                       | Second part after comma                  |
  | capabilityStars   | Count <img src="...star...">             | integer    | 2, 3, 4, 5
                       | Count filled star images                 |
  | isAuditedSupplier | <span class="as-logo"> presence          | boolean    | false
                       | Present = audited, absent = not          |
  | certifications    | <span class="icon-text"> text            | string     | "ODM, OEM, Own Brand"
                       | Capabilities/certifications text         |
  | companyLogoUrl    | JavaScript variable $com.comLogoPhotoUrl | string     | null (dynamic)
                       | NOT in static HTML - loaded via JS       |
  | inquiryUrl        | <a class="contact-btn" href>             | string     |
  "https://www.made-in-china.com/sendInquiry/shrom_PBkGYzgbCcVN_PBkGYzgbCcVN.html" | Contact inquiry link                     |
  | chatId            | <b class="tm3_chat_status" cid>          | string     | "PBkGYzgbCcVN"
                       | Supplier ID for chat                     |
  | productList       | <ul class="rec-product"><li><a href>     | JSON array |
  ["//ailinsofa.en.made-in-china.com/product/SpXUgwZuLlWD/...", ...]               | Product detail page URLs                 |
  | productImages     | <img data-original> inside product list  | JSON array | ["https://image.made-in-china.com/2f1j00yFLVGhNZMsRb/...", 
  ...]                  | Product thumbnail image URLs             |

  ---
  Step 4: Final JSON Output

  {
    "success": true,
    "keyword": "compressible sofa",
    "page": 1,
    "totalCount": "56",
    "companies": [
      {
        "companyName": "Guangzhou Ailin Home Technology Co., LTD",
        "companyUrl": "https://ailinsofa.en.made-in-china.com",
        "companyId": "PBkGYzgbCcVN",
        "businessType": null,
        "mainProducts": "[\"Sofa\", \"Compressed Sofa\", \"Living Room Sofa\", \"Compression Sofa\", \"Modular Sofa\"]",
        "city": "Foshan",
        "province": "Guangdong",
        "isAuditedSupplier": false,
        "capabilityStars": 2,
        "certifications": null,
        "companyLogoUrl": null,
        "inquiryUrl":
  "https://www.made-in-china.com/sendInquiry/shrom_PBkGYzgbCcVN_PBkGYzgbCcVN.html?from=search&type=cs&target=com&word=compressible+sofa",
        "chatId": "PBkGYzgbCcVN",
        "productList": "[
          \"//ailinsofa.en.made-in-china.com/product/SpXUgwZuLlWD/China-Modern-Compressible-Sofa-Bed-...\",
          \"//ailinsofa.en.made-in-china.com/product/FUQrzEfjvqWA/China-High-Density-Compressed-Sofa-...\",
          \"//ailinsofa.en.made-in-china.com/product/zZQAfVIERsTx/China-Sponge-Foam-Compressed-Sofa-...\"
        ]",
        "productImages": "[
          \"https://image.made-in-china.com/2f1j00yFLVGhNZMsRb/Modern-Compressible-Sofa-Bed-...\",
          \"https://image.made-in-china.com/2f1j00CjfBNPgdGMbn/High-Density-Compressed-Sofa-...\",
          \"https://image.made-in-china.com/2f1j00WnGljkiMrvYe/Sponge-Foam-Compressed-Sofa-...\"
        ]"
      }
    ]
  }

  ---
  Important Notes on Missing Fields

  Company Logo/Image URL ❌

  - Not in static HTML - Referenced as $com.comLogoPhotoUrl (JavaScript template variable)
  - Would need to either:
    a. Execute JavaScript to get populated variable
    b. Make additional API call to fetch company details
    c. Crawl the company profile page

  Other Possibly Missing Fields ❌

  - Company ratings/reviews - Not shown in listing (requires profile page visit)
  - Response time - Not visible in search results
  - Verification badges (Gold member, etc.) - Not explicitly shown in this layout
  - Number of employees, factory certification - Not in listing

  ---
  Complete API Flow Diagram

  INPUT
    ↓
  GET /company-search/{keyword}/C1/{page}.html
    ↓
  FETCH HTML
    ↓
  PARSE with BeautifulSoup
    ├─ Find: <div class="list-node"> (each supplier)
    ├─ Extract: Company name, URL, ID from h2.company-name
    ├─ Extract: Stars from img count in auth-icon-list
    ├─ Extract: Main Products & City/Province from table
    ├─ Extract: Product URLs from ul.rec-product
    ├─ Extract: Product images from img data-original
    ├─ Extract: Contact/Inquiry URLs
    └─ Extract: Chat ID from tm3_chat_status
    ↓
  OUTPUT JSON (TOON Encoded)
    {
      success, keyword, page, totalCount,
      companies: [
        {
          companyName, companyUrl, companyId,
          mainProducts, city, province,
          capabilityStars, isAuditedSupplier,
          inquiryUrl, chatId,
          productList, productImages,
          certifications, businessType
        }
      ]
    }

  ---
  Summary: Complete Field Coverage

  | Category               | Fields                                      | Coverage                 |
  |------------------------|---------------------------------------------|--------------------------|
  | Company Identification | name, url, ID                               | ✅ 100%                   |
  | Location               | city, province                              | ✅ 100%                   |
  | Products               | main products, product list, product images | ✅ 100%                   |
  | Ratings                | capability stars, audited status            | ✅ 100%                   |
  | Contact                | inquiry URL, chat ID                        | ✅ 100%                   |
  | Images                 | company logo/photo                          | ❌ 0% (JavaScript-loaded) |
  | Certifications         | business type, certifications text          | ⚠️ 30% (rarely shown)    |