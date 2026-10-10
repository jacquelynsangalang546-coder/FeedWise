# Requirements Checklist (mapped to the CTADWEBL Final Project PDF)

Legend: ✅ implemented and checked · 🟡 implemented, must be confirmed on your machine · 👥 your group must do this

"Checked" means it was run during development: 85/85 automated API checks (`npm run test:api`), `tsc` + `vite build` with no errors, and browser runs of every page at 1440px and 375px plus a scripted flow (sale, validation errors, create/edit/delete, void). That testing used a local MongoDB-compatible server, **not Atlas** — see the 🟡 items.

## General / theme

| PDF requirement | Status | Where |
| --- | --- | --- |
| Full-stack app with React, Express, MongoDB | ✅ | `client/`, `server/` |
| Processes data, not just stores it (totals, discounts, statistics, availability, status rules, ranking, date logic, multi-criteria search) | ✅ | `server/services/*` |
| Original concept (pet & poultry supply store) | ✅ | — |
| Landing page | ✅ | `client/src/pages/LandingPage.tsx` |

## Required technologies

| Technology | Status | Where |
| --- | --- | --- |
| React (Vite) + TypeScript | ✅ | `client/vite.config.ts`, `tsconfig*.json` |
| Tailwind CSS with custom theme | ✅ | `client/src/index.css` (`@theme`: pasture, leaf, grain, barn palettes; fonts; shadows) |
| React Router multi-page | ✅ | `client/src/App.tsx` (14 routes) |
| React Hook Form + Zod | ✅ | `client/src/schemas/*`, all forms |
| axios | ✅ | `client/src/api/client.ts` |
| Node.js + Express | ✅ | `server/app.js` |
| MongoDB Atlas / Mongoose | 🟡 | Mongoose models done; connect with your Atlas URI |
| Git and GitHub | 👥 | `.gitignore` files ready; see `CONTRIBUTIONS.md` |

## 1. Database and data modeling

| Requirement | Status | Where |
| --- | --- | --- |
| At least 2 related collections (rubric "Excellent": 5+) | ✅ 6 | `Category`, `Supplier`, `Customer`, `Product`, `Sale`, `SaleItem` |
| ObjectId references | ✅ | Product→Category/Supplier, Sale→Customer, SaleItem→Sale/Product/Category |
| Required fields + rules (min, max, enum, default, unique, match, custom) | ✅ | e.g. `Product.sku` unique+regex, `sellingPrice >= costPrice` custom validator, enums for unit/animalType/payment/status |
| Timestamps | ✅ | `{ timestamps: true }` on all schemas |
| Seeded sample data | ✅ | `server/seed/seed.js` (6 categories, 5 suppliers, 10 customers, 28 products, ~140 sales over 45 days) |

## 2. REST API

| Requirement | Status | Where |
| --- | --- | --- |
| ≥ 20 endpoints | ✅ 34 | README "Endpoint summary" |
| Full CRUD on main collection (list, get one, create, update, delete) | ✅ | Products (also Categories, Suppliers, Customers) |
| 3–5+ processing endpoints (rubric "Excellent": 5+) | ✅ 12+ | low-stock, check-availability, stock adjust, sales preview, create sale, void, dashboard, sales-summary, top-products, category-sales, inventory, product search |
| Plural nouns, HTTP verb as action | ✅ | `/api/products`, `/api/sales/:id/void` (PATCH) |
| Status codes 200, 201, 400, 404, 500 | ✅ | 200/201 in controllers; 400/404 via `ApiError` + error handler; 500 for unexpected errors (409 additionally for duplicate sale) |
| Consistent JSON error `{ "message": ... }` | ✅ | `server/middleware/errorHandler.js`, `notFound.js` |
| Mongoose validation errors → 400; invalid IDs handled | ✅ | `errorHandler.js`, `middleware/validateObjectId.js` |
| Routes in `routes/` with express.Router, models in `models/`, clean `app.js` | ✅ | `server/routes`, `server/models`, `server/app.js` |
| Custom request logger, error handler, JSON 404, correct order | ✅ | `app.js`: logger → routes → notFound → errorHandler |
| `.env` with PORT and MONGO_URI, ignored by Git, `.env.example` committed | ✅ | `server/.env.example`, `server/.gitignore` |
| CORS configured for frontend | ✅ | `app.js` uses `CLIENT_URL` |

## Your project brief (extra requirements)

| Requirement | Status | Where |
| --- | --- | --- |
| Subtotal, discount, final total | ✅ | `services/pricingService.js` |
| Stock availability checking | ✅ | `POST /products/check-availability`, used inside sale creation |
| Low-stock detection by reorder level | ✅ | `GET /products/low-stock` |
| Sales statistics and summaries | ✅ | `/reports/dashboard`, `/reports/sales-summary` |
| Top-selling product ranking | ✅ | `/reports/top-products` |
| Automatic stock deduction after sale | ✅ | `services/saleService.js` `createSale` |
| Prevent negative stock / overselling | ✅ | conditional `$inc` with `stock >= qty`; tested |
| Prevent invalid quantities | ✅ | integers 1–1000, server and client |
| Prevent duplicate sale processing | ✅ | `clientRequestId` unique + 409; tested |
| Prevent invalid discounts | ✅ | max 50%, fixed ≤ subtotal; tested |
| Sale and inventory consistent, failed transactions handled | ✅ / 🟡 | `utils/transaction.js`. Compensating rollback **tested** (simulated failure restored stock, no orphan sale). Real Atlas transaction path is standard Mongoose `withTransaction`; confirm the server prints `Transactions: enabled (replica set)` |
| 12 pages listed in the brief | ✅ 14 | see README page table |

## 3. Frontend application

| Requirement | Status | Where |
| --- | --- | --- |
| ≥ 10 pages with React Router | ✅ 14 | `App.tsx` |
| All API calls through one axios instance (`axios.create` + baseURL) | ✅ | `src/api/client.ts`; every call goes through `src/api/index.ts` |
| Loading and error states on every data screen | ✅ | `LoadingState`, `ErrorState` (with retry) on every page that loads data |
| Create/edit forms: RHF + Zod schema, `z.infer`, per-field errors | ✅ | schemas in `src/schemas/` (outside components), `zodResolver`, `Field` component shows errors; server field errors mapped with `applyServerErrors` |
| Submit properly gated | ✅ | `isSubmitting` loading buttons, invalid forms do not submit, sale button disabled when cart empty/over stock |
| Delete with confirmation | ✅ | `ConfirmDialog` on products, categories, suppliers, customers; void sale has its own reason dialog |
| Lists use stable IDs as keys, never index | ✅ | all `key={item._id}` / fixed string ids |
| Derived values computed during render, not stored in state | ✅ | cart totals in `NewSalePage`, margin preview in `ProductForm`, summaries in Products/Sales/Customers/Reports pages |
| Custom hook in `hooks/` | ✅ | `useApi`, `useDebounce`, `useDocumentTitle` |
| Empty states + success feedback after create/update/delete | ✅ | `EmptyState`, toasts (`ToastContext`) |

## 4. Frontend design

| Requirement | Status | Notes |
| --- | --- | --- |
| Modern: spacing, hierarchy, consistent corners/shadows, palette in Tailwind theme | ✅ | `index.css` `@theme` |
| Unique, not a template | ✅ | custom feed-store palette and receipt-style landing hero |
| Readable, aligned, nothing overflowing | ✅ | checked by screenshots |
| Responsive at 375px, no horizontal scrolling | ✅ | measured `scrollWidth - innerWidth = 0` on every page at 375px; wide tables become cards on mobile |
| Consistent buttons/cards/fields | ✅ | shared `Button`, `Card`, `Field`, `Badge` components |
| Fonts | 🟡 | Bricolage Grotesque + Public Sans load from Google Fonts; needs internet (falls back to system fonts) |

## 5. Repository and documentation

| Requirement | Status | Notes |
| --- | --- | --- |
| Client and server repos / folders | ✅ | separate `client/` and `server/` folders with their own package.json; works as one repo or two |
| Every member has meaningful commits from own account | 👥 | follow `CONTRIBUTIONS.md` |
| node_modules and .env not committed | ✅ | `.gitignore` in root, client, server (ZIP contains neither) |
| README: title, members, concept | ✅ / 👥 | fill in member names |
| README: what it does / data processed | ✅ | |
| README: screenshots | ✅ | `screenshots/` (retake if you change the UI) |
| README: setup + environment variables | ✅ | plus `SETUP_GUIDE.md` |
| README: API table (method, path, purpose, sample request, sample response) | ✅ | |
| README: features and known limitations | ✅ | |
| Public repo or instructor added; link submitted in Teams with member contributions | 👥 | template in `CONTRIBUTIONS.md` |

## Before the defense (Oct 12–13)

- [ ] Each member runs the project on their own laptop with the group's Atlas cluster.
- [ ] `npm run seed`, then both servers running **before** presenting.
- [ ] Practice the demo script in the README (validation error + not-found case are graded).
- [ ] Each member can explain every file in their slice **and** the data flow React → axios → Express → Mongoose → MongoDB.
