# Suggested Contribution Plan

The rubric checks **each member's own commits** and anyone may be asked about **any** part of the project. Split the work so each person owns a vertical slice (backend + frontend for one feature), commits it gradually, and studies the other slices before the defense.

> Commit from your **own** GitHub account (`git config user.email` must match your GitHub email). Several small, meaningful commits over several days look much better than one large upload.

## Suggested split for 4 members

| Member | Owns (files) | Must be able to explain |
| --- | --- | --- |
| **1 – Backend foundation & inventory** | `server/app.js`, `server.js`, `config/db.js`, `middleware/*`, `utils/ApiError.js`, `models/Category.js`, `models/Supplier.js`, `models/Product.js`, `controllers/categoryController.js`, `supplierController.js`, `productController.js`, `routes/categoryRoutes.js`, `supplierRoutes.js`, `productRoutes.js`, `services/inventoryService.js` | Middleware order (logger → routes → 404 → error handler), how Mongoose errors become 400, ObjectId validation, low-stock and availability logic, why stock updates use `{ stock: { $gte: qty } }` |
| **2 – Sales logic & reports API** | `models/Sale.js`, `models/SaleItem.js`, `models/Customer.js`, `services/pricingService.js`, `services/saleService.js`, `services/reportService.js`, `utils/transaction.js`, `utils/money.js`, `utils/dates.js`, `controllers/saleController.js`, `customerController.js`, `reportController.js`, routes for sales/customers/reports, `seed/*`, `scripts/smoke-test.js` | Discount/VAT/change calculation in centavos, transaction + rollback, duplicate-sale prevention (`clientRequestId`, 409), void rule, top-product ranking, date ranges in Philippine time |
| **3 – Frontend foundation, products & catalog pages** | `client/` setup files, `src/index.css` (theme), `src/api/*`, `src/hooks/*`, `src/context/ToastContext.tsx`, `src/components/ui/*`, `src/components/layout/*`, `src/schemas/productSchema.ts`, `categorySchema.ts`, `supplierSchema.ts`, `customerSchema.ts`, pages: `LandingPage`, `ProductsPage`, `AddProductPage`, `EditProductPage`, `ProductDetailsPage`, `CategoriesPage`, `SuppliersPage`, `CustomersPage`, `NotFoundPage` | The single axios instance, the `useApi` custom hook, React Hook Form + Zod (`z.infer`, `zodResolver`, per-field errors), stable keys, URL-based filters, confirmation dialogs, responsive layout |
| **4 – Point of sale, history & dashboards** | `src/schemas/saleSchema.ts`, `stockSchema.ts`, `src/components/charts/*`, `src/components/products/AdjustStockModal.tsx`, pages: `DashboardPage`, `NewSalePage`, `SalesHistoryPage`, `SaleDetailsPage`, `ReportsPage`; `README.md` screenshots + API table; `REQUIREMENTS_CHECKLIST.md` | `useFieldArray` cart, derived totals computed during render (not stored in state), preview → confirm flow, handling 400/409 responses, charts with Recharts |

**3 members:** merge Member 4's pages into Members 2 (sales pages, reports page) and 3 (dashboard, charts).
**5 members:** give `CustomersPage`, `SuppliersPage`, `CategoriesPage` and their schemas to a fifth member, plus `SETUP_GUIDE.md` and the presentation slides.

## Suggested commit timeline

Commit as you integrate and test each piece, for example:

| Order | Member | Example commit message |
| --- | --- | --- |
| 1 | 1 | `Set up Express app with CORS, logger, 404 and error handler` |
| 2 | 1 | `Add Category and Supplier models with validation` |
| 3 | 3 | `Set up Vite React TypeScript client with Tailwind theme` |
| 4 | 3 | `Add axios instance, useApi hook and UI components` |
| 5 | 1 | `Add Product model, CRUD routes and search filters` |
| 6 | 2 | `Add Customer, Sale and SaleItem models` |
| 7 | 2 | `Add pricing service for discounts, VAT and change` |
| 8 | 3 | `Add products list, add and edit pages with Zod validation` |
| 9 | 1 | `Add low-stock and availability endpoints` |
| 10 | 2 | `Add sale creation with atomic stock deduction and rollback` |
| 11 | 4 | `Add new sale page with cart and review step` |
| 12 | 2 | `Add sales summary, top products and inventory reports` |
| 13 | 4 | `Add dashboard and reports pages with charts` |
| 14 | 3 | `Add categories, suppliers and customers pages` |
| 15 | 4 | `Add sales history and sale details with void` |
| 16 | 2 | `Add seed data and API smoke test` |
| 17 | all | `Fix responsive layout at 375px`, `Update README API table`, … |

## Submission post template (Microsoft Teams)

```
FeedWise: Pet and Poultry Supply Sales and Inventory Management System
Repository: https://github.com/<owner>/<repo>

Members and contributions
- <Name 1>: Express setup, middleware, inventory models/routes, low-stock & availability logic
- <Name 2>: Sales/pricing/report services, transactions, seed data, API tests
- <Name 3>: React setup, theme, axios/hooks, product & catalog pages and forms
- <Name 4>: Point of sale, sales history/details, dashboard & reports, README
```
