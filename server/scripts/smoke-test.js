/**
 * API smoke test - checks every endpoint, status codes and business rules.
 * 1. Start the API (npm run dev) on a SEEDED database
 * 2. In a second terminal: npm run test:api
 *
 * It creates temporary records and removes them at the end.
 * The one test sale it creates is voided (stock is returned) because sales are never deleted.
 */
import 'dotenv/config';
import crypto from 'node:crypto';

const BASE = process.env.API_URL ?? `http://localhost:${process.env.PORT ?? 5000}/api`;
let passed = 0;
let failed = 0;

async function call(method, path, body) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
  });
  const json = await response.json().catch(() => null);
  return { status: response.status, body: json };
}

function check(name, condition, extra = '') {
  if (condition) {
    passed += 1;
    console.log(`  \x1b[32mPASS\x1b[0m ${name}`);
  } else {
    failed += 1;
    console.log(`  \x1b[31mFAIL\x1b[0m ${name} ${extra}`);
  }
}

async function expectStatus(name, method, path, status, body) {
  const result = await call(method, path, body);
  check(`${method} ${path} -> ${status}  (${name})`, result.status === status, `got ${result.status}: ${JSON.stringify(result.body)?.slice(0, 200)}`);
  return result;
}

async function run() {
  console.log(`Testing ${BASE}\n`);

  console.log('Basics & middleware');
  await expectStatus('health', 'GET', '/health', 200);
  const notFound = await expectStatus('unknown route', 'GET', '/does-not-exist', 404);
  check('404 is JSON with message', typeof notFound.body?.message === 'string');
  await expectStatus('invalid ObjectId', 'GET', '/products/abc123', 400);
  await expectStatus('valid but missing ID', 'GET', '/products/000000000000000000000000', 404);
  await expectStatus('malformed JSON', 'POST', '/categories', 400, '{"name": ');

  console.log('\nCategories CRUD');
  const categories = await expectStatus('list', 'GET', '/categories', 200);
  check('categories seeded', categories.body?.data?.length >= 5);
  const badCategory = await expectStatus('validation error', 'POST', '/categories', 400, { name: 'x' });
  check('per-field errors returned', typeof badCategory.body?.errors?.name === 'string');
  const tag = crypto.randomBytes(3).toString('hex').toUpperCase();
  const createdCategory = await expectStatus('create', 'POST', '/categories', 201, {
    name: `Test Category ${tag}`,
    color: 'teal',
  });
  const categoryId = createdCategory.body?.data?._id;
  await expectStatus('duplicate name', 'POST', '/categories', 400, { name: `Test Category ${tag}` });
  await expectStatus('get one', 'GET', `/categories/${categoryId}`, 200);
  await expectStatus('update', 'PUT', `/categories/${categoryId}`, 200, { description: 'Updated by smoke test' });

  console.log('\nSuppliers & customers CRUD');
  await expectStatus('list suppliers', 'GET', '/suppliers', 200);
  await expectStatus('bad phone', 'POST', '/suppliers', 400, { name: 'Bad Supplier', contactPerson: 'X', phone: '123' });
  const supplier = await expectStatus('create supplier', 'POST', '/suppliers', 201, {
    name: `Smoke Supplier ${tag}`,
    contactPerson: 'Test Person',
    phone: '09170000000',
  });
  const supplierId = supplier.body?.data?._id;
  await expectStatus('update supplier', 'PUT', `/suppliers/${supplierId}`, 200, { leadTimeDays: 6 });
  await expectStatus('get supplier', 'GET', `/suppliers/${supplierId}`, 200);

  await expectStatus('list customers', 'GET', '/customers?type=farm', 200);
  await expectStatus('bad customer type filter', 'GET', '/customers?type=vip', 400);
  const phone = `0917${String(Date.now()).slice(-7)}`;
  const customer = await expectStatus('create customer', 'POST', '/customers', 201, {
    name: 'Smoke Test Customer',
    phone,
    customerType: 'retail',
  });
  const customerId = customer.body?.data?._id;
  await expectStatus('duplicate phone', 'POST', '/customers', 400, { name: 'Another', phone });
  await expectStatus('update customer', 'PUT', `/customers/${customerId}`, 200, { address: 'San Fernando' });

  console.log('\nProducts CRUD + search');
  await expectStatus('list with filters', 'GET', '/products?animalType=poultry&sort=-price', 200);
  await expectStatus('invalid sort', 'GET', '/products?sort=banana', 400);
  const lowFilter = await expectStatus('stockStatus=low filter', 'GET', '/products?stockStatus=low', 200);
  check('low filter returns only low items', lowFilter.body?.data?.every((p) => p.stockStatus === 'low'));
  await expectStatus('selling < cost rejected', 'POST', '/products', 400, {
    name: 'Bad Price',
    sku: `BAD-${tag}`,
    category: categoryId,
    costPrice: 100,
    sellingPrice: 50,
    stock: 1,
    reorderLevel: 1,
  });
  const product = await expectStatus('create product', 'POST', '/products', 201, {
    name: `Smoke Test Feed ${tag}`,
    sku: `SMK-${tag}`,
    category: categoryId,
    supplier: supplierId,
    animalType: 'poultry',
    unit: 'sack',
    costPrice: 100,
    sellingPrice: 150,
    stock: 10,
    reorderLevel: 3,
  });
  const productId = product.body?.data?._id;
  await expectStatus('duplicate SKU', 'POST', '/products', 400, {
    name: 'Dup',
    sku: `SMK-${tag}`,
    category: categoryId,
    costPrice: 1,
    sellingPrice: 2,
    stock: 1,
    reorderLevel: 1,
  });
  await expectStatus('get product', 'GET', `/products/${productId}`, 200);
  await expectStatus('update product', 'PUT', `/products/${productId}`, 200, { sellingPrice: 160 });
  await expectStatus('negative stock rejected', 'PUT', `/products/${productId}`, 400, { stock: -5 });

  console.log('\nInventory logic');
  await expectStatus('low-stock list', 'GET', '/products/low-stock', 200);
  const availability = await expectStatus('check availability', 'POST', '/products/check-availability', 200, {
    items: [{ productId, quantity: 50 }],
  });
  check('detects shortage of 40', availability.body?.data?.items?.[0]?.shortage === 40);
  await expectStatus('stock cannot go negative', 'PATCH', `/products/${productId}/stock`, 400, {
    adjustment: -999,
    reason: 'Damaged',
  });
  const restock = await expectStatus('restock +5', 'PATCH', `/products/${productId}/stock`, 200, {
    adjustment: 5,
    reason: 'Delivery',
  });
  check('stock now 15', restock.body?.data?.stock === 15);

  console.log('\nSales logic');
  const preview = await expectStatus('preview totals', 'POST', '/sales/preview', 200, {
    items: [{ productId, quantity: 2 }, { productId, quantity: 1 }],
    discountType: 'percent',
    discountValue: 10,
    paymentMethod: 'cash',
    amountTendered: 500,
  });
  // 3 x 160 = 480, 10% off = 48 -> 432, change 68
  check('subtotal 480', preview.body?.data?.subtotal === 480);
  check('discount 48', preview.body?.data?.discountAmount === 48);
  check('total 432', preview.body?.data?.total === 432);
  check('change 68', preview.body?.data?.payment?.change === 68);
  check('VAT 46.29', preview.body?.data?.vatAmount === 46.29);

  await expectStatus('discount over 50%', 'POST', '/sales/preview', 400, {
    items: [{ productId, quantity: 1 }],
    discountType: 'percent',
    discountValue: 80,
    paymentMethod: 'cash',
  });
  await expectStatus('fixed discount > subtotal', 'POST', '/sales/preview', 400, {
    items: [{ productId, quantity: 1 }],
    discountType: 'fixed',
    discountValue: 9999,
    paymentMethod: 'gcash',
  });
  await expectStatus('quantity 0', 'POST', '/sales', 400, {
    clientRequestId: crypto.randomUUID(),
    items: [{ productId, quantity: 0 }],
    paymentMethod: 'cash',
  });
  await expectStatus('quantity 1.5', 'POST', '/sales', 400, {
    clientRequestId: crypto.randomUUID(),
    items: [{ productId, quantity: 1.5 }],
    paymentMethod: 'cash',
  });
  const oversell = await expectStatus('oversell blocked', 'POST', '/sales', 400, {
    clientRequestId: crypto.randomUUID(),
    items: [{ productId, quantity: 999 }],
    paymentMethod: 'gcash',
  });
  check('shortage details returned', Array.isArray(oversell.body?.details));
  await expectStatus('cash short', 'POST', '/sales', 400, {
    clientRequestId: crypto.randomUUID(),
    items: [{ productId, quantity: 1 }],
    paymentMethod: 'cash',
    amountTendered: 10,
  });
  await expectStatus('missing customer', 'POST', '/sales', 404, {
    clientRequestId: crypto.randomUUID(),
    items: [{ productId, quantity: 1 }],
    paymentMethod: 'gcash',
    customer: '000000000000000000000000',
  });

  const requestId = crypto.randomUUID();
  const salePayload = {
    clientRequestId: requestId,
    customer: customerId,
    items: [{ productId, quantity: 4 }],
    discountType: 'fixed',
    discountValue: 40,
    paymentMethod: 'cash',
    amountTendered: 1000,
  };
  const sale = await expectStatus('create sale', 'POST', '/sales', 201, salePayload);
  const saleId = sale.body?.data?._id;
  check('sale total 600 (640 - 40)', sale.body?.data?.total === 600);
  check('sale has 1 line item', sale.body?.data?.items?.length === 1);
  const afterSale = await call('GET', `/products/${productId}`);
  check('stock deducted 15 -> 11', afterSale.body?.data?.stock === 11);
  const duplicate = await expectStatus('duplicate submission blocked', 'POST', '/sales', 409, salePayload);
  check('duplicate returns original sale id', duplicate.body?.details?.saleId === saleId);
  const afterDuplicate = await call('GET', `/products/${productId}`);
  check('stock unchanged by duplicate', afterDuplicate.body?.data?.stock === 11);

  await expectStatus('list sales', 'GET', '/sales?status=completed&paymentMethod=cash', 200);
  await expectStatus('bad date filter', 'GET', '/sales?from=2026-13-40', 400);
  await expectStatus('get sale', 'GET', `/sales/${saleId}`, 200);
  await expectStatus('customer with sales cannot be deleted', 'DELETE', `/customers/${customerId}`, 400);
  await expectStatus('product with sales cannot be deleted', 'DELETE', `/products/${productId}`, 400);
  await expectStatus('void needs reason', 'PATCH', `/sales/${saleId}/void`, 400, {});
  await expectStatus('void sale', 'PATCH', `/sales/${saleId}/void`, 200, { reason: 'Smoke test cleanup' });
  const afterVoid = await call('GET', `/products/${productId}`);
  check('stock returned 11 -> 15', afterVoid.body?.data?.stock === 15);
  await expectStatus('cannot void twice', 'PATCH', `/sales/${saleId}/void`, 400, { reason: 'Again' });

  console.log('\nReports');
  await expectStatus('dashboard', 'GET', '/reports/dashboard', 200);
  const summary = await expectStatus('sales summary', 'GET', '/reports/sales-summary', 200);
  check('daily series has 30 days', summary.body?.data?.daily?.length === 30);
  await expectStatus('reversed date range', 'GET', '/reports/sales-summary?from=2026-10-10&to=2026-10-01', 400);
  const top = await expectStatus('top products', 'GET', '/reports/top-products?limit=5', 200);
  const ranks = top.body?.data?.products ?? [];
  check(
    'ranking sorted by quantity',
    ranks.every((row, i) => i === 0 || ranks[i - 1].quantitySold >= row.quantitySold)
  );
  await expectStatus('bad limit', 'GET', '/reports/top-products?limit=500', 400);
  await expectStatus('category sales', 'GET', '/reports/category-sales', 200);
  await expectStatus('inventory report', 'GET', '/reports/inventory', 200);

  console.log('\nCleanup / delete rules');
  await expectStatus('category in use cannot be deleted', 'DELETE', `/categories/${categoryId}`, 400);
  await expectStatus('supplier in use cannot be deleted', 'DELETE', `/suppliers/${supplierId}`, 400);
  await expectStatus('archive product', 'PUT', `/products/${productId}`, 200, { isActive: false });
  await expectStatus('archived product cannot be sold', 'POST', '/sales', 400, {
    clientRequestId: crypto.randomUUID(),
    items: [{ productId, quantity: 1 }],
    paymentMethod: 'gcash',
  });

  // Delete a product that was never sold
  const temp = await call('POST', '/products', {
    name: 'Temp Product',
    sku: `TMP-${tag}`,
    category: categoryId,
    costPrice: 1,
    sellingPrice: 2,
    stock: 1,
    reorderLevel: 0,
  });
  await expectStatus('delete unsold product', 'DELETE', `/products/${temp.body?.data?._id}`, 200);
  await expectStatus('deleted product is gone', 'GET', `/products/${temp.body?.data?._id}`, 404);

  console.log(`\n${passed} passed, ${failed} failed`);
  console.log(
    `Note: test records "Test Category ${tag}", "Smoke Supplier ${tag}", "Smoke Test Customer" and archived product SMK-${tag} remain because a (voided) sale references them. Re-run "npm run seed" to reset the data.`
  );
  process.exitCode = failed > 0 ? 1 : 0;
}

run().catch((error) => {
  console.error('Smoke test crashed:', error.message);
  console.error('Is the API running? Start it with "npm run dev" first.');
  process.exitCode = 1;
});
