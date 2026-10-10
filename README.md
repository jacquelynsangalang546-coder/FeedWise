# FeedWise: Pet and Poultry Supply Sales and Inventory Management System

**Course:** CTADWEBL – Advanced Web Programming (Final Project), NU Clark, A.Y. 2026-2027

**Group members**

| Name | GitHub username | Role |
| --- | --- | --- |
| Jacquelyn D. Sangalang | @jacquelynsangalang546-coder | Lead Developer |
| Mikaella D. Tarine | @mikaellatrn| Quality Assurance and Documentation |

---

## Concept

FeedWise is a sales and inventory system for a local store that sells poultry feeds, dog food, cat food, vitamins and pet accessories. The cashier rings up sales; the system prices them, applies discounts and VAT, deducts stock the moment a sale completes, and warns the owner which products are running low or about to expire.

### What data it processes

| Data | What FeedWise computes from it |
| --- | --- |
| Products (price, cost, stock, reorder level, expiry) | Stock status (in stock / low / out), margin %, suggested reorder quantity and cost, expiry alerts, stock value at cost and at shelf price |
| Sales and sale items | Subtotal, percent or fixed discount, VAT (12%, price-inclusive), total, change, gross profit; daily revenue trends; highest/lowest/average sale; payment method distribution; category share |
| Sale items over a date range | Ranking of top-selling products by units, revenue or profit |
| Customers + sales | Purchase count, total and average spent, last purchase date |
| Suppliers + products | Products supplied, how many need reordering, lead time |

### Business rules enforced by the server

- Stock can never go negative: every deduction is an atomic `findOneAndUpdate` with the condition `stock >= quantity`.
- Overselling is refused with **400** and a list of shortages.
- Quantities must be whole numbers from 1 to 1,000 per product; duplicate lines are merged.
- Percent discounts are capped at **50%** (store policy); fixed discounts cannot exceed the subtotal.
- Cash received must cover the total; change is computed.
- Prices always come from the database, never from the browser.
- **Duplicate sale prevention:** every checkout sends a unique `clientRequestId`. A second request with the same id is rejected with **409** and the id of the sale that was already recorded (protects against double-clicks and network retries). A unique index on the field guards against two requests arriving at the same instant.
- **Consistency on failure:** stock deduction, the sale record and its line items are saved as one unit. On MongoDB Atlas this is a real multi-document transaction; if any step fails, nothing is saved. On a standalone local MongoDB (no transactions) the same code runs compensating "undo" steps in reverse order.
- Voiding (`completed → voided`) is the only status change allowed, needs a reason, and returns all items to stock. A voided sale cannot be voided again.
- Selling price can never be lower than cost price.
- Deleting is blocked when it would break history: categories/suppliers still used by products, customers with sales, products that appear in sales (archive them instead).

---

## Screenshots

Captured from the running app with the seeded data. Retake them on your machine if you change the UI or data.

| Landing page | Dashboard |
| --- | --- |
| ![Landing page](screenshots/landing.png) | ![Dashboard](screenshots/dashboard.png) |
| **New sale (point of sale)** | **Reports** |
| ![New sale](screenshots/new-sale.png) | ![Reports](screenshots/reports.png) |

Mobile (375px): ![Mobile dashboard](screenshots/mobile-dashboard.png)

--- | --- |
| Landing page | `screenshots/landing.png` |
| Dashboard | `screenshots/dashboard.png` |
| New sale (checkout) | `screenshots/new-sale.png` |
| Reports | `screenshots/reports.png` |
| Mobile (375px) | `screenshots/mobile-dashboard.png` |

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19 + Vite + TypeScript, Tailwind CSS v4 (custom `@theme`), React Router, React Hook Form + Zod, axios, Recharts, lucide-react icons |
| Backend | Node.js + Express 5, Mongoose 8, dotenv, cors |
| Database | MongoDB Atlas |
| Tools | Git + GitHub, nodemon |

---

## Project structure

```
FeedWise/
├── README.md, SETUP_GUIDE.md, CONTRIBUTIONS.md, REQUIREMENTS_CHECKLIST.md
├── server/                      Express REST API
│   ├── app.js                   configuration + mounting only
│   ├── server.js                connects to MongoDB, starts listening
│   ├── config/db.js             Mongoose connection (+ detects transaction support)
│   ├── models/                  Category, Supplier, Customer, Product, Sale, SaleItem
│   ├── routes/                  one express.Router() per resource
│   ├── controllers/             request handling for each route
│   ├── services/                business logic: pricing, inventory, sales, reports
│   ├── middleware/              logger, validateObjectId, notFound, errorHandler
│   ├── utils/                   ApiError, money (centavo math), dates (store time), transaction helper
│   ├── seed/                    seed.js + realistic sample data
│   └── scripts/smoke-test.js    85 automated API checks
└── client/                      React frontend
    └── src/
        ├── api/                 client.ts (the ONE axios instance) + typed API functions
        ├── components/          layout/, ui/ (Button, Card, Modal, Field...), products/, charts/
        ├── context/             ToastContext (success / error notifications)
        ├── hooks/               useApi (custom data-loading hook), useDebounce, useDocumentTitle
        ├── pages/               14 pages (see below)
        ├── schemas/             Zod schemas (outside components) + z.infer types
        ├── types/               API data types
        └── utils/               formatting and error helpers
```

### Frontend pages (React Router)

| # | Route | Page |
| --- | --- | --- |
| 1 | `/` | Landing page |
| 2 | `/dashboard` | Dashboard: today, this month, stock value, 7-day chart, top sellers, reorder list, recent sales |
| 3 | `/products` | Products: search + filters (category, animal, stock status, archived) + sort |
| 4 | `/products/new` | Add product |
| 5 | `/products/:id/edit` | Edit product |
| 6 | `/products/:id` | Product details: stock bar, lifetime sales, supplier, expiry |
| 7 | `/categories` | Categories (create / edit / delete in a modal) |
| 8 | `/suppliers` | Suppliers (create / edit / delete) |
| 9 | `/customers` | Customers with purchase statistics (create / edit / delete) |
| 10 | `/sales/new` | New sale (point of sale with review + confirm step) |
| 11 | `/sales` | Sales history with filters |
| 12 | `/sales/:id` | Sale details / receipt, void sale |
| 13 | `/reports` | Sales and inventory reports |
| 14 | `*` | Not found page (also used for missing products / sales) |

---

## Setup

**Windows users with only VS Code installed: follow [SETUP_GUIDE.md](SETUP_GUIDE.md) step by step.**

Quick version (Node.js 20.19+ or 22+ and a MongoDB Atlas cluster required):

```bash
# 1. API
cd server
cp .env.example .env          # then put your Atlas connection string in MONGO_URI
npm install
npm run seed                  # loads sample data (deletes existing FeedWise data)
npm run dev                   # http://localhost:5000/api

# 2. Frontend (second terminal)
cd client
cp .env.example .env
npm install
npm run dev                   # http://localhost:5173
```

### Environment variables

| File | Variable | Example | Purpose |
| --- | --- | --- | --- |
| `server/.env` | `PORT` | `5000` | Port of the API |
| `server/.env` | `MONGO_URI` | `mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/feedwise?retryWrites=true&w=majority` | Atlas connection string; `/feedwise` is the database name |
| `server/.env` | `CLIENT_URL` | `http://localhost:5173` | Frontend origin allowed by CORS (comma-separate several) |
| `client/.env` | `VITE_API_URL` | `http://localhost:5000/api` | Base URL used by the axios instance |

`.env` files are git-ignored; only `.env.example` files are committed.

### Scripts

| Folder | Command | What it does |
| --- | --- | --- |
| server | `npm run dev` | Start API with auto-restart (nodemon) |
| server | `npm start` | Start API |
| server | `npm run seed` | Reset the database with sample data |
| server | `npm run test:api` | Run 85 endpoint and business-rule checks against the running API |
| client | `npm run dev` | Start the React dev server |
| client | `npm run build` | Type-check and build for production |
| client | `npm run typecheck` | TypeScript check only |

---

## API documentation

Base URL: `http://localhost:5000/api`. All bodies are JSON.

**Success format:** `{ "data": ..., "message"?: "...", "meta"?: {...} }`
**Error format (every error):** `{ "message": "Record not found", "errors"?: { "field": "message" }, "details"?: ... }`

**Status codes used:** `200` OK, `201` created, `400` validation / business-rule error / invalid ID, `404` record or route not found, `409` duplicate sale submission, `500` unexpected server error.

### Endpoint summary (34 endpoints + JSON 404 catch-all)

| # | Method | Path | Purpose | Processing |
| --- | --- | --- | --- | --- |
| 1 | GET | `/health` | API status | |
| 2 | GET | `/categories` | List categories with product and low-stock counts | ✔ counts |
| 3 | GET | `/categories/:id` | One category with its products | |
| 4 | POST | `/categories` | Create category | |
| 5 | PUT | `/categories/:id` | Update category | |
| 6 | DELETE | `/categories/:id` | Delete (blocked if products use it) | ✔ rule |
| 7 | GET | `/suppliers?search=` | List suppliers with products supplied and reorder count | ✔ |
| 8 | GET | `/suppliers/:id` | One supplier with products | |
| 9 | POST | `/suppliers` | Create supplier | |
| 10 | PUT | `/suppliers/:id` | Update supplier | |
| 11 | DELETE | `/suppliers/:id` | Delete (blocked if products use it) | ✔ rule |
| 12 | GET | `/customers?search=&type=` | List customers with purchase count, total/average spent, last purchase | ✔ stats |
| 13 | GET | `/customers/:id` | One customer with stats and recent sales | ✔ stats |
| 14 | POST | `/customers` | Create customer | |
| 15 | PUT | `/customers/:id` | Update customer | |
| 16 | DELETE | `/customers/:id` | Delete (blocked if they have sales) | ✔ rule |
| 17 | GET | `/products?search=&category=&supplier=&animalType=&stockStatus=&status=&sort=` | Multi-criteria search, filter and sort | ✔ search |
| 18 | GET | `/products/:id` | One product with lifetime units sold and revenue | ✔ |
| 19 | POST | `/products` | Create product | |
| 20 | PUT | `/products/:id` | Update product (also archive / restore with `isActive`) | |
| 21 | DELETE | `/products/:id` | Delete (blocked if it appears in sales) | ✔ rule |
| 22 | GET | `/products/low-stock` | Products at/below reorder level, urgency-sorted, with suggested order qty and cost | ✔ **low-stock detection** |
| 23 | POST | `/products/check-availability` | Check requested quantities against stock | ✔ **stock availability** |
| 24 | PATCH | `/products/:id/stock` | Add/remove stock with a reason; cannot go below zero | ✔ rule |
| 25 | GET | `/sales?search=&status=&paymentMethod=&customer=&from=&to=` | Sales history with filters and revenue total | ✔ |
| 26 | GET | `/sales/:id` | One sale with its line items | |
| 27 | POST | `/sales/preview` | Price a cart and check stock without saving | ✔ **totals** |
| 28 | POST | `/sales` | Complete a sale: validate, price, deduct stock, save atomically | ✔ **totals + stock deduction** |
| 29 | PATCH | `/sales/:id/void` | Void a completed sale and return stock | ✔ status rule |
| 30 | GET | `/reports/dashboard` | Today vs yesterday, month totals, stock health, 7-day trend, top 5, recent sales | ✔ **statistics** |
| 31 | GET | `/reports/sales-summary?from=&to=` | Count, revenue, profit, margin, avg/highest/lowest sale, best day, daily series, payment distribution | ✔ **statistics** |
| 32 | GET | `/reports/top-products?from=&to=&limit=&sortBy=` | Top-selling ranking by quantity, revenue or profit | ✔ **ranking** |
| 33 | GET | `/reports/category-sales?from=&to=` | Revenue, profit and share by category | ✔ |
| 34 | GET | `/reports/inventory` | Stock valuation, status distribution, category totals, expiry alerts, reorder list | ✔ |
| — | any | unknown path | JSON 404 catch-all | |

### Sample requests and responses

Responses below are trimmed (`…`). Their shape is exactly what the API returns; IDs, counts and amounts depend on your seeded data and the current date.

#### Categories / Suppliers / Customers (CRUD)

| Method & path | Sample request | Sample response |
| --- | --- | --- |
| `GET /categories` | – | `200 { "data": [ { "_id": "6ac8…76f", "name": "Cat Food", "color": "violet", "productCount": 4, "lowStockCount": 1, … } ] }` |
| `POST /categories` | `{ "name": "Bird Seeds", "description": "Seeds for pet birds", "color": "teal" }` | `201 { "message": "Category created", "data": { "_id": "…", "name": "Bird Seeds", … } }` |
| `POST /categories` (invalid) | `{ "name": "x" }` | `400 { "message": "Validation failed", "errors": { "name": "Category name must be at least 2 characters" } }` |
| `PUT /categories/:id` | `{ "description": "Updated" }` | `200 { "message": "Category updated", "data": { … } }` |
| `DELETE /categories/:id` (in use) | – | `400 { "message": "Cannot delete \"Poultry Feeds\" - 6 product(s) still belong to it. Move or delete them first." }` |
| `GET /categories/abc` | – | `400 { "message": "Invalid ID format: \"abc\"" }` |
| `GET /categories/000000000000000000000000` | – | `404 { "message": "Category not found" }` |
| `POST /suppliers` | `{ "name": "Bulacan Feeds", "contactPerson": "Ana Cruz", "phone": "09171234567", "leadTimeDays": 3 }` | `201 { "message": "Supplier created", "data": { … } }` |
| `POST /suppliers` (bad phone) | `{ "name": "X Co", "contactPerson": "X", "phone": "123" }` | `400 { "message": "Validation failed", "errors": { "phone": "Phone must be a PH mobile number like 09171234567" } }` |
| `GET /customers?type=farm` | – | `200 { "data": [ { "name": "Aling Remy Pascual", "purchaseCount": 8, "totalSpent": 18337, "averageSpent": 2292.13, "lastPurchaseAt": "2026-10-03T07:50:00.000Z", … } ] }` |
| `POST /customers` (duplicate phone) | `{ "name": "Another", "phone": "09171110002" }` | `400 { "message": "A record with this phone number \"09171110002\" already exists", "errors": { "phone": "This phone number is already used" } }` |
| `DELETE /customers/:id` (has sales) | – | `400 { "message": "Cannot delete \"Liza Mendoza\" - they have 12 sale(s) on record. Sales history must be kept." }` |

#### Products

| Method & path | Sample request | Sample response |
| --- | --- | --- |
| `GET /products?animalType=poultry&stockStatus=low&sort=-price` | – | `200 { "data": [ { "name": "Broiler Grower Pellets 50kg", "sku": "PF-GRW-50", "stock": 6, "reorderLevel": 8, "stockStatus": "low", "marginPercent": 10.5, "expiryStatus": "ok", "category": { "name": "Poultry Feeds" }, … } ], "meta": { "count": 1 } }` |
| `POST /products` | `{ "name": "Pigeon Mix 1kg", "sku": "PF-PGN-1K", "category": "<categoryId>", "supplier": "<supplierId>", "animalType": "general", "unit": "pack", "costPrice": 60, "sellingPrice": 80, "stock": 25, "reorderLevel": 8, "expiryDate": "2027-03-01" }` | `201 { "message": "Product created", "data": { "_id": "…", "sku": "PF-PGN-1K", "stockStatus": "ok", "marginPercent": 25, … } }` |
| `POST /products` (price below cost) | `{ …, "costPrice": 100, "sellingPrice": 50 }` | `400 { "message": "Validation failed", "errors": { "sellingPrice": "Selling price cannot be lower than cost price" } }` |
| `PUT /products/:id` | `{ "sellingPrice": 85, "reorderLevel": 10 }` | `200 { "message": "Product updated", "data": { … } }` |
| `PUT /products/:id` (archive) | `{ "isActive": false }` | `200 { "message": "Product updated", "data": { "isActive": false, … } }` |
| `DELETE /products/:id` (sold before) | – | `400 { "message": "Cannot delete \"Layer Mash Complete 50kg\" - it appears in 21 sale(s). Archive it instead (set it to inactive)." }` |
| `GET /products/low-stock` | – | `200 { "data": [ { "name": "Gamefowl Conditioning Pellets 25kg", "stock": 0, "reorderLevel": 4, "stockStatus": "out", "stockRatio": 0, "suggestedReorderQty": 8, "estimatedReorderCost": 9920, "supplier": { "name": "Luzon Feeds Distribution", "phone": "09181234502", "leadTimeDays": 4 } }, … ], "meta": { "count": 6 } }` |
| `POST /products/check-availability` | `{ "items": [ { "productId": "<id>", "quantity": 50 } ] }` | `200 { "data": { "allAvailable": false, "items": [ { "name": "Layer Mash Complete 50kg", "requested": 50, "available": 22, "sufficient": false, "shortage": 28, "reason": "Only 22 sack(s) left" } ] } }` |
| `PATCH /products/:id/stock` | `{ "adjustment": 20, "reason": "Delivery from supplier" }` | `200 { "message": "Stock added: 20 unit(s)", "data": { "stock": 42, "previousStock": 22, … } }` |
| `PATCH /products/:id/stock` (too many) | `{ "adjustment": -999, "reason": "Damaged" }` | `400 { "message": "Cannot remove 999 units - only 22 in stock", "errors": { "adjustment": "Stock cannot go below zero (current stock: 22)" } }` |

#### Sales

| Method & path | Sample request | Sample response |
| --- | --- | --- |
| `POST /sales/preview` | `{ "items": [ { "productId": "<Layer Mash id>", "quantity": 2 } ], "discountType": "percent", "discountValue": 10, "paymentMethod": "cash", "amountTendered": 3000 }` | `200 { "data": { "subtotal": 3120, "discountAmount": 312, "total": 2808, "vatAmount": 300.86, "grossProfit": 28, "payment": { "amountTendered": 3000, "change": 192 }, "availability": { "allAvailable": true, "items": [ { "requested": 2, "available": 22, "remainingAfterSale": 20, "willBeLowStock": false } ] }, "canComplete": true } }` |
| `POST /sales` | `{ "clientRequestId": "8d0c8a09-e102-42cd-b406-769684375e77", "customer": "<customerId or null>", "items": [ { "productId": "<id>", "quantity": 2 } ], "discountType": "fixed", "discountValue": 40, "paymentMethod": "cash", "amountTendered": 4000, "notes": "" }` | `201 { "message": "Sale FW-20261009-A30F6E completed", "data": { "_id": "…", "saleNumber": "FW-20261009-A30F6E", "subtotal": 3120, "discountAmount": 40, "total": 3080, "vatAmount": 330, "change": 920, "status": "completed", "items": [ { "productName": "Layer Mash Complete 50kg", "unitPrice": 1560, "quantity": 2, "lineTotal": 3120 } ] } }` |
| `POST /sales` (same clientRequestId again) | same body | `409 { "message": "This sale was already processed", "details": { "saleId": "…", "saleNumber": "FW-20261009-A30F6E" } }` |
| `POST /sales` (oversell) | `{ …, "items": [ { "productId": "<id>", "quantity": 999 } ] }` | `400 { "message": "Insufficient stock for one or more products", "details": [ { "name": "Layer Mash Complete 50kg", "requested": 999, "available": 22, "reason": "Only 22 sack(s) left" } ] }` |
| `POST /sales` (bad quantity) | `{ …, "items": [ { "productId": "<id>", "quantity": 1.5 } ] }` | `400 { "message": "Sale request is invalid", "errors": { "items.0.quantity": "Quantity must be a whole number of at least 1" } }` |
| `POST /sales/preview` (discount too high) | `{ …, "discountType": "percent", "discountValue": 80 }` | `400 { "message": "Sale request is invalid", "errors": { "discountValue": "Percent discount cannot exceed 50%" } }` |
| `POST /sales` (cash short) | `{ …, "paymentMethod": "cash", "amountTendered": 10 }` | `400 { "message": "Amount tendered is less than the total", "errors": { "amountTendered": "Customer must pay at least ₱160.00" } }` |
| `GET /sales?status=completed&from=2026-10-01&to=2026-10-09` | – | `200 { "data": [ … ], "meta": { "count": 22, "completedCount": 22, "totalRevenue": 52790.1 } }` |
| `GET /sales/:id` | – | `200 { "data": { "saleNumber": "…", "customer": { "name": "Liza Mendoza", … }, "items": [ … ], … } }` |
| `PATCH /sales/:id/void` | `{ "reason": "Customer cancelled order" }` | `200 { "message": "Sale FW-… voided and stock returned", "data": { "status": "voided", "voidReason": "Customer cancelled order", … } }` |
| `PATCH /sales/:id/void` (again) | `{ "reason": "Again" }` | `400 { "message": "Sale FW-… is already voided and cannot be voided again" }` |

#### Reports

| Method & path | Sample response |
| --- | --- |
| `GET /reports/dashboard` | `200 { "data": { "today": { "revenue": 7049, "salesCount": 2, "itemsSold": 9, "changeVsYesterday": 218.2 }, "month": { "revenue": 60123.1, "grossProfit": 7881.1, "salesCount": 25, "averageSale": 2404.92 }, "inventory": { "activeProducts": 28, "lowStock": 4, "outOfStock": 2, "nearExpiry": 4, "valueAtCost": 167478 }, "last7Days": [ { "date": "2026-10-03", "revenue": 8490, "profit": 980, "salesCount": 3 }, … ], "topProducts": [ … ], "recentSales": [ … ] } }` |
| `GET /reports/sales-summary?from=2026-09-10&to=2026-10-09` | `200 { "data": { "salesCount": 95, "revenue": 206372.05, "grossProfit": 27219.05, "profitMargin": 13.2, "totalDiscounts": 1684.95, "averageSale": 2172.34, "highestSale": { "total": 5975, "customerName": "Carlo Bautista" }, "lowestSale": { … }, "bestDay": { "date": "2026-09-19", "revenue": 17652.4 }, "paymentBreakdown": [ { "method": "cash", "count": 64, "amount": 140804.75, "share": 68.2 }, … ], "daily": [ … 30 days … ] } }` |
| `GET /reports/top-products?limit=3&sortBy=revenue` | `200 { "data": { "totalRevenue": 208057, "products": [ { "rank": 1, "productName": "Broiler Grower Pellets 50kg", "quantitySold": 22, "revenue": 35640, "profit": 3740, "marginPercent": 10.5, "revenueShare": 17.1, "currentStock": 6, "stockStatus": "low" }, … ] } }` |
| `GET /reports/category-sales` | `200 { "data": { "totalRevenue": 208057, "categories": [ { "name": "Poultry Feeds", "revenue": 102835, "profit": 11573, "units": 261, "share": 49.4 }, … ] } }` |
| `GET /reports/inventory` | `200 { "data": { "productCount": 28, "totalUnits": 750, "costValue": 167478, "retailValue": 195482, "potentialProfit": 28004, "statusCounts": { "ok": 22, "low": 4, "out": 2 }, "categories": [ … ], "expiryAlerts": [ { "name": "Electrolytes Plus Poultry Drink 1kg", "expiryStatus": "expired", "daysLeft": -4 } ], "lowStock": [ … ] } }` |
| `GET /reports/sales-summary?from=2026-10-10&to=2026-10-01` | `400 { "message": "\"from\" date must be on or before \"to\" date" }` |
| `GET /does-not-exist` | `404 { "message": "Route not found: GET /api/does-not-exist" }` |

---

## Features

- Landing page and a responsive store dashboard (desktop sidebar, mobile drawer menu; usable at 375px with no horizontal page scrolling).
- Point-of-sale screen: tap products to add, quantity steppers, customer, percent/fixed discount, cash/GCash/card, cash received and change; totals computed live in the browser, then confirmed by the server before the sale is saved.
- Automatic stock deduction with rollback on failure; duplicate-submission protection.
- Void sales with a reason; stock is returned.
- Products: multi-criteria search/filter/sort kept in the URL, desktop table and mobile cards, archive/restore, stock adjustments with a reason, live margin preview in the form.
- Low-stock detection with suggested reorder quantity and cost; expiry alerts (expired / within 30 days).
- Reports: date presets or custom range, daily revenue and profit chart, highest/lowest/average sale, best day, payment mix, category share, top-product ranking (units, revenue or profit), inventory valuation.
- Customer purchase statistics and top buyer highlight; supplier lead times and reorder counts.
- Every data screen has loading, error (with retry) and empty states; success and error toasts after every create, update and delete; confirmation before deletes.
- Forms use React Hook Form with Zod schemas defined outside components, `z.infer` types, per-field errors, and server-side field errors shown under the matching input (e.g. duplicate SKU).

## Known limitations

- No login or user roles (not required for this project). Anyone who can open the site can make sales.
- No payment gateway: GCash and card are recorded as payment methods only.
- Stock adjustments are applied immediately but their history (who/when/why) is not stored in its own collection.
- Reports group sales by day in Philippine time (UTC+8) and compute totals in Node.js rather than with MongoDB aggregation pipelines; fine for a single store's volume, slower for very large datasets.
- Category sales use line totals before sale-level discounts, so their sum can be slightly higher than revenue after discounts.
- Sales list returns at most 500 records per request (no pagination UI).
- Not deployed; runs locally (deployment was not required).

---

## Defense demo script (5 minutes)

1. **Landing → Dashboard.** Explain the data flow: React page → `useApi` hook → the single axios instance (`client/src/api/client.ts`) → Express route → controller → service → Mongoose model → MongoDB Atlas, and back as JSON.
2. **New sale.** Add 2 sacks of Layer Mash, choose Percent 80 → shows *"Percent discount cannot exceed 50%"* (**validation error**). Change to 10, Review sale, Complete. Open Products and show the stock went down by 2.
3. **Duplicate protection.** Explain `clientRequestId` and the 409 response.
4. **Not-found case.** Visit `/products/000000000000000000000000` (page shows *Product not found*) and `http://localhost:5000/api/products/abc` (400 invalid ID) and `/api/nope` (JSON 404).
5. **Reports.** Change the ranking from Units to Revenue; open the Inventory tab and show the reorder list.
6. **Void** the sale you just made and show the stock returned.

Postman/Thunder Client users: run `npm run test:api` in `server/` to show all 85 checks passing.

---

## Repository and submission

The PDF asks for both "two repositories (client and server)" and "a single repository with client and server folders". The code is organized so that either works:

- **Single repository (as written in the Submission Instructions):** push this whole `FeedWise/` folder.
- **Two repositories:** push `server/` as its own repository and `client/` as another. Each folder has its own `package.json`, `.gitignore`, `.env.example` and README.

Ask your instructor which one they want. See [CONTRIBUTIONS.md](CONTRIBUTIONS.md) for a suggested split of work and commit plan so every member has meaningful commits.
