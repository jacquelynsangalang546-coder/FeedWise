import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, CheckCircle2, Minus, PackageSearch, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { customerApi, productApi, saleApi, type SalePayload } from '../api';
import { StockBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { errorProps, Field, Input, Select, Textarea } from '../components/ui/Field';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { SearchInput } from '../components/ui/SearchInput';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States';
import { useToast } from '../context/ToastContext';
import { useApi } from '../hooks/useApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { MAX_PERCENT_DISCOUNT, saleSchema, type SaleFormValues } from '../schemas/saleSchema';
import type { Product, SalePreview } from '../types';
import { getErrorBody, getErrorMessage, getErrorStatus } from '../utils/errors';
import { formatPeso, paymentLabel, unitLabel } from '../utils/format';

const DEFAULTS: SaleFormValues = {
  customer: '',
  items: [],
  discountType: 'none',
  discountValue: 0,
  paymentMethod: 'cash',
  amountTendered: undefined,
  notes: '',
};

// Unique id for one checkout attempt; the server rejects a second sale with the same id.
function newRequestId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

const toCents = (value: number) => Math.round(value * 100);

export default function NewSalePage() {
  useDocumentTitle('New sale');
  const toast = useToast();
  const navigate = useNavigate();

  const products = useApi(() => productApi.list({ status: 'active', sort: 'name' }), []);
  const customers = useApi(() => customerApi.list(), []);
  const [search, setSearch] = useState('');
  const [preview, setPreview] = useState<SalePreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const requestId = useRef(newRequestId());

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<SaleFormValues>({ resolver: zodResolver(saleSchema), defaultValues: DEFAULTS });
  const { fields, append, remove, update } = useFieldArray({ control, name: 'items', keyName: 'fieldKey' });

  const productsById = useMemo(() => new Map((products.data ?? []).map((product) => [product._id, product])), [products.data]);

  // ---- Derived values (computed on every render, never stored in state) ----
  const items = watch('items');
  const discountType = watch('discountType');
  const discountValue = watch('discountValue');
  const paymentMethod = watch('paymentMethod');
  const amountTendered = watch('amountTendered');

  const lines = items
    .map((item, index) => ({ ...item, index, product: productsById.get(item.productId) }))
    .filter((line): line is typeof line & { product: Product } => Boolean(line.product));
  const subtotalCents = lines.reduce((sum, line) => sum + toCents(line.product.sellingPrice) * (Number.isFinite(line.quantity) ? line.quantity : 0), 0);
  const safeDiscount = Number.isFinite(discountValue) ? discountValue : 0;
  const discountCents =
    discountType === 'percent'
      ? Math.round((subtotalCents * Math.min(safeDiscount, MAX_PERCENT_DISCOUNT)) / 100)
      : discountType === 'fixed'
        ? Math.min(toCents(safeDiscount), subtotalCents)
        : 0;
  const totalCents = subtotalCents - discountCents;
  const fixedTooHigh = discountType === 'fixed' && toCents(safeDiscount) > subtotalCents && subtotalCents > 0;
  const changeCents = amountTendered !== undefined && Number.isFinite(amountTendered) ? toCents(amountTendered) - totalCents : null;
  const overStock = lines.filter((line) => line.quantity > line.product.stock);
  const unitCount = lines.reduce((sum, line) => sum + (Number.isFinite(line.quantity) ? line.quantity : 0), 0);

  const searchTerm = search.trim().toLowerCase();
  const visibleProducts = (products.data ?? []).filter(
    (product) => !searchTerm || product.name.toLowerCase().includes(searchTerm) || product.sku.toLowerCase().includes(searchTerm)
  );

  const addProduct = (product: Product) => {
    if (product.stock <= 0) return;
    const index = items.findIndex((item) => item.productId === product._id);
    if (index >= 0) {
      const next = Math.min(items[index].quantity + 1, product.stock);
      update(index, { productId: product._id, quantity: next });
    } else {
      append({ productId: product._id, quantity: 1 });
    }
    clearErrors('items');
  };

  const changeQuantity = (index: number, delta: number) => {
    const item = items[index];
    const current = Number.isFinite(item.quantity) ? item.quantity : 0;
    const next = current + delta;
    if (next < 1) remove(index);
    else setValue(`items.${index}.quantity`, next, { shouldValidate: true });
  };

  const buildPayload = (values: SaleFormValues): SalePayload => ({
    customer: values.customer || null,
    items: values.items.map(({ productId, quantity }) => ({ productId, quantity })),
    discountType: values.discountType,
    discountValue: values.discountType === 'none' ? 0 : values.discountValue,
    paymentMethod: values.paymentMethod,
    amountTendered: values.paymentMethod === 'cash' ? values.amountTendered ?? totalCents / 100 : undefined,
    notes: values.notes,
  });

  // Step 1: ask the server to price the cart and check stock (nothing is saved)
  const onReview = async (values: SaleFormValues) => {
    setServerError(null);
    let blocked = false;
    values.items.forEach((item, index) => {
      const product = productsById.get(item.productId);
      if (product && item.quantity > product.stock) {
        setError(`items.${index}.quantity`, { message: `Only ${product.stock} in stock` });
        blocked = true;
      }
    });
    if (fixedTooHigh) {
      setError('discountValue', { message: 'Discount cannot be greater than the subtotal' });
      blocked = true;
    }
    if (values.paymentMethod === 'cash' && values.amountTendered !== undefined && toCents(values.amountTendered) < totalCents) {
      setError('amountTendered', { message: `Customer must pay at least ${formatPeso(totalCents / 100)}` });
      blocked = true;
    }
    if (blocked) return;

    setPreviewing(true);
    try {
      setPreview(await saleApi.preview(buildPayload(values)));
    } catch (error) {
      const body = getErrorBody(error);
      if (body?.errors?.discountValue) setError('discountValue', { message: body.errors.discountValue });
      setServerError(getErrorMessage(error));
    } finally {
      setPreviewing(false);
    }
  };

  // Step 2: complete the sale. The same request id is reused if the cashier clicks twice.
  const completeSale = async () => {
    setCompleting(true);
    try {
      const result = await saleApi.create({ ...buildPayload(watch()), clientRequestId: requestId.current });
      requestId.current = newRequestId();
      toast.success(result.message ?? 'Sale completed');
      navigate(`/sales/${result.data._id}`);
    } catch (error) {
      const status = getErrorStatus(error);
      const details = getErrorBody(error)?.details as { saleId?: string } | undefined;
      if (status === 409 && details?.saleId) {
        toast.success('This sale was already recorded');
        navigate(`/sales/${details.saleId}`);
        return;
      }
      setPreview(null);
      setServerError(getErrorMessage(error));
      products.refresh(); // stock may have changed
    } finally {
      setCompleting(false);
    }
  };

  if (products.loading) {
    return (
      <>
        <PageHeader title="New sale" />
        <LoadingState rows={6} label="Loading products" />
      </>
    );
  }
  if (products.error) {
    return (
      <>
        <PageHeader title="New sale" />
        <ErrorState message={products.error} onRetry={products.refetch} />
      </>
    );
  }

  return (
    <>
      <PageHeader title="New sale" description="Pick products, set the discount and payment, then review before completing." />

      <form onSubmit={handleSubmit(onReview)} noValidate className={`${fields.length > 0 ? "pb-20 lg:pb-0" : ""} grid items-start gap-6 lg:grid-cols-[1fr_24rem] xl:grid-cols-[1fr_27rem]`}>
        {/* Product picker */}
        <Card className="p-4 sm:p-5">
          <SearchInput placeholder="Search product or SKU" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search products to add" />
          {visibleProducts.length === 0 ? (
            <EmptyState icon={<PackageSearch className="size-6" />} title="No product found" message="Check the spelling or search by SKU." />
          ) : (
            <ul className="-mx-1 mt-4 grid max-h-[24rem] gap-2 overflow-y-auto px-1 pb-1 sm:grid-cols-2 lg:max-h-none lg:overflow-visible">
              {visibleProducts.map((product) => {
                const inCart = items.find((item) => item.productId === product._id)?.quantity ?? 0;
                const soldOut = product.stock <= 0;
                return (
                  <li key={product._id}>
                    <button
                      type="button"
                      onClick={() => addProduct(product)}
                      disabled={soldOut || inCart >= product.stock}
                      className={`flex h-full w-full flex-col rounded-xl p-3.5 text-left ring-1 ring-inset transition-colors disabled:cursor-not-allowed ${
                        inCart > 0 ? 'bg-leaf-50 ring-leaf-500' : 'bg-surface ring-line hover:bg-pasture-50'
                      } ${soldOut ? 'opacity-55' : ''}`}
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className="font-semibold leading-snug text-ink-900">{product.name}</span>
                        {inCart > 0 && (
                          <span className="shrink-0 rounded-full bg-leaf-600 px-2 py-0.5 text-xs font-bold text-white tabular">{inCart}</span>
                        )}
                      </span>
                      <span className="mt-2 flex w-full items-center justify-between gap-2">
                        <span className="font-semibold text-pasture-900 tabular">
                          {formatPeso(product.sellingPrice)}
                          <span className="text-xs font-normal text-ink-500"> / {product.unit}</span>
                        </span>
                        {product.stockStatus === 'ok' ? (
                          <span className="text-xs text-ink-500 tabular">{product.stock} left</span>
                        ) : (
                          <StockBadge status={product.stockStatus} />
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Cart / checkout */}
        <Card id="checkout" className="scroll-mt-20 lg:sticky lg:top-6">
          <div className="flex items-center justify-between border-b border-line/70 px-5 py-4">
            <h2 className="text-lg font-semibold text-pasture-900">Current sale</h2>
            <span className="text-sm text-ink-500 tabular">
              {unitCount} item{unitCount === 1 ? '' : 's'}
            </span>
          </div>

          {fields.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <ShoppingCart className="mx-auto size-8 text-ink-300" aria-hidden />
              <p className="mt-2 text-sm text-ink-500">Tap a product to add it to this sale.</p>
              {errors.items?.message && <p className="mt-2 text-sm font-semibold text-barn-600">{errors.items.message}</p>}
            </div>
          ) : (
            <ul className="max-h-80 divide-y divide-line/70 overflow-y-auto">
              {fields.map((field, index) => {
                const product = productsById.get(field.productId);
                const quantity = items[index]?.quantity;
                const lineError = errors.items?.[index]?.quantity?.message;
                if (!product) return null;
                return (
                  <li key={field.fieldKey} className="px-5 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm leading-snug font-semibold">{product.name}</p>
                        <p className="text-xs text-ink-500 tabular">
                          {formatPeso(product.sellingPrice)} each, {product.stock} in stock
                        </p>
                      </div>
                      <p className="shrink-0 font-semibold tabular">
                        {formatPeso((toCents(product.sellingPrice) * (Number.isFinite(quantity) ? quantity : 0)) / 100)}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <button type="button" onClick={() => changeQuantity(index, -1)} className="rounded-lg p-2 ring-1 ring-line ring-inset hover:bg-canvas" aria-label={`Decrease ${product.name}`}>
                        <Minus className="size-3.5" />
                      </button>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        aria-label={`Quantity of ${product.name}`}
                        className="h-9 w-16 rounded-lg border-0 text-center text-sm font-semibold ring-1 ring-line ring-inset focus:ring-2 focus:ring-leaf-600 aria-[invalid=true]:ring-barn-500"
                        aria-invalid={Boolean(lineError) || quantity > product.stock}
                        {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                      />
                      <button
                        type="button"
                        onClick={() => changeQuantity(index, 1)}
                        disabled={quantity >= product.stock}
                        className="rounded-lg p-2 ring-1 ring-line ring-inset hover:bg-canvas disabled:opacity-40"
                        aria-label={`Increase ${product.name}`}
                      >
                        <Plus className="size-3.5" />
                      </button>
                      <span className="text-xs text-ink-500">{unitLabel(product.unit, quantity)}</span>
                      <button type="button" onClick={() => remove(index)} className="ml-auto rounded-lg p-2 text-ink-400 hover:bg-barn-50 hover:text-barn-600" aria-label={`Remove ${product.name}`}>
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    {(lineError || quantity > product.stock) && (
                      <p className="mt-1 text-xs font-semibold text-barn-600">{lineError ?? `Only ${product.stock} in stock`}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <div className="space-y-4 border-t border-line/70 px-5 py-4">
            <Field label="Customer" htmlFor="sale-customer">
              <Select id="sale-customer" disabled={customers.loading} {...register('customer')}>
                <option value="">Walk-in customer</option>
                {customers.data?.map((customer) => (
                  <option key={customer._id} value={customer._id}>
                    {customer.name} ({customer.customerType})
                  </option>
                ))}
              </Select>
            </Field>
            {customers.error && <p className="text-sm text-barn-600">Customers could not be loaded: {customers.error}</p>}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Discount" htmlFor="sale-discount-type">
                <Select
                  id="sale-discount-type"
                  {...register('discountType', {
                    onChange: (event) => {
                      if (event.target.value === 'none') setValue('discountValue', 0, { shouldValidate: true });
                    },
                  })}
                >
                  <option value="none">None</option>
                  <option value="percent">Percent (%)</option>
                  <option value="fixed">Fixed (₱)</option>
                </Select>
              </Field>
              <Field label={discountType === 'percent' ? 'Percent off' : 'Amount off'} htmlFor="sale-discount-value" error={errors.discountValue?.message}>
                <Input
                  id="sale-discount-value"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  readOnly={discountType === 'none'}
                  {...register('discountValue', { valueAsNumber: true })}
                  {...errorProps('sale-discount-value', errors.discountValue?.message)}
                />
              </Field>
            </div>
            {discountType === 'percent' && <p className="-mt-2 text-xs text-ink-500">Store policy allows up to {MAX_PERCENT_DISCOUNT}% off.</p>}

            <fieldset>
              <legend className="mb-1.5 text-sm font-semibold text-ink-700">Payment</legend>
              <div className="grid grid-cols-3 gap-2">
                {(['cash', 'gcash', 'card'] as const).map((method) => (
                  <label
                    key={method}
                    className={`cursor-pointer rounded-xl py-2.5 text-center text-sm font-semibold ring-1 ring-inset ${
                      paymentMethod === method ? 'bg-pasture-900 text-white ring-pasture-900' : 'ring-line hover:bg-canvas'
                    }`}
                  >
                    <input type="radio" value={method} className="sr-only" {...register('paymentMethod')} />
                    {paymentLabel[method]}
                  </label>
                ))}
              </div>
            </fieldset>

            {paymentMethod === 'cash' && (
              <Field label="Cash received (₱)" htmlFor="sale-tendered" error={errors.amountTendered?.message} hint="Leave blank for exact amount">
                <Input
                  id="sale-tendered"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  placeholder={formatPeso(totalCents / 100)}
                  {...register('amountTendered', { setValueAs: (value) => (value === '' || value === null ? undefined : Number(value)) })}
                  {...errorProps('sale-tendered', errors.amountTendered?.message)}
                />
              </Field>
            )}

            <Field label="Notes" htmlFor="sale-notes" error={errors.notes?.message}>
              <Textarea id="sale-notes" rows={2} className="min-h-0" placeholder="Optional" {...register('notes')} />
            </Field>
          </div>

          <dl className="space-y-1.5 border-t border-line/70 bg-canvas/60 px-5 py-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-500">Subtotal</dt>
              <dd className="tabular">{formatPeso(subtotalCents / 100)}</dd>
            </div>
            {discountCents > 0 && (
              <div className="flex justify-between text-leaf-700">
                <dt>Discount</dt>
                <dd className="tabular">−{formatPeso(discountCents / 100)}</dd>
              </div>
            )}
            <div className="flex items-baseline justify-between pt-1">
              <dt className="font-display text-lg font-bold">Total</dt>
              <dd className="font-display text-2xl font-bold text-pasture-900 tabular">{formatPeso(totalCents / 100)}</dd>
            </div>
            {paymentMethod === 'cash' && changeCents !== null && (
              <div className={`flex justify-between font-semibold ${changeCents < 0 ? 'text-barn-600' : 'text-ink-700'}`}>
                <dt>{changeCents < 0 ? 'Still due' : 'Change'}</dt>
                <dd className="tabular">{formatPeso(Math.abs(changeCents) / 100)}</dd>
              </div>
            )}
          </dl>

          <div className="space-y-3 px-5 pt-1 pb-5">
            {serverError && (
              <p role="alert" className="flex gap-2 rounded-xl bg-barn-50 px-3.5 py-2.5 text-sm text-barn-700">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                {serverError}
              </p>
            )}
            <Button
              type="submit"
              size="lg"
              className="w-full"
              loading={previewing}
              disabled={fields.length === 0 || overStock.length > 0}
            >
              Review sale
            </Button>
          </div>
        </Card>
      </form>

      {/* Mobile shortcut to the checkout panel */}
      {fields.length > 0 && (
        <a
          href="#checkout"
          className="fixed inset-x-4 bottom-4 z-20 flex items-center justify-between rounded-xl bg-pasture-900 px-4 py-3 text-white shadow-pop lg:hidden"
        >
          <span className="text-sm">
            {unitCount} item{unitCount === 1 ? '' : 's'}
          </span>
          <span className="font-semibold tabular">Checkout {formatPeso(totalCents / 100)}</span>
        </a>
      )}

      {preview && (
        <Modal open title="Confirm sale" description="Totals and stock were checked by the server." onClose={() => !completing && setPreview(null)}>
          <ul className="divide-y divide-line/70 text-sm">
            {preview.lines.map((line) => (
              <li key={line.sku} className="flex justify-between gap-3 py-2">
                <span>
                  <span className="font-semibold tabular">{line.quantity} ×</span> {line.productName}
                </span>
                <span className="tabular">{formatPeso(line.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1.5 border-t border-dashed border-ink-300 pt-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-500">Customer</dt>
              <dd>{preview.customerName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Subtotal</dt>
              <dd className="tabular">{formatPeso(preview.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Discount</dt>
              <dd className="tabular">−{formatPeso(preview.discountAmount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">VAT included (12%)</dt>
              <dd className="tabular">{formatPeso(preview.vatAmount)}</dd>
            </div>
            <div className="flex justify-between pt-1 font-display text-xl font-bold text-pasture-900">
              <dt>Total</dt>
              <dd className="tabular">{formatPeso(preview.total)}</dd>
            </div>
            {preview.payment && paymentMethod === 'cash' && (
              <div className="flex justify-between font-semibold">
                <dt>
                  Cash {formatPeso(preview.payment.amountTendered)}, change
                </dt>
                <dd className="tabular">{formatPeso(preview.payment.change)}</dd>
              </div>
            )}
          </dl>

          {preview.availability.items.some((item) => item.willBeLowStock) && (
            <p className="mt-4 rounded-xl bg-grain-50 px-3.5 py-2.5 text-sm text-grain-700">
              After this sale,{' '}
              {preview.availability.items
                .filter((item) => item.willBeLowStock)
                .map((item) => item.name)
                .join(', ')}{' '}
              will be at or below the reorder level.
            </p>
          )}
          {!preview.canComplete && (
            <div role="alert" className="mt-4 rounded-xl bg-barn-50 px-3.5 py-2.5 text-sm text-barn-700">
              {preview.paymentError ??
                preview.availability.items
                  .filter((item) => !item.sufficient)
                  .map((item) => `${item.name}: ${item.reason}`)
                  .join('. ')}
            </div>
          )}

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setPreview(null)} disabled={completing}>
              Back to sale
            </Button>
            <Button onClick={completeSale} loading={completing} disabled={!preview.canComplete} icon={<CheckCircle2 className="size-4" />}>
              Complete sale
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
