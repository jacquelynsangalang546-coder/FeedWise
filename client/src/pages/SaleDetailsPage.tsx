import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Ban, Printer } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';
import { saleApi } from '../api';
import { SaleStatusBadge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { errorProps, Field, Input } from '../components/ui/Field';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { ErrorState, LoadingState } from '../components/ui/States';
import { useToast } from '../context/ToastContext';
import { useApi } from '../hooks/useApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { voidSaleSchema, type VoidSaleValues } from '../schemas/stockSchema';
import { applyServerErrors, getErrorMessage } from '../utils/errors';
import { formatDateTime, formatPeso, paymentLabel, unitLabel } from '../utils/format';
import NotFoundPage from './NotFoundPage';

function VoidSaleModal({ saleId, saleNumber, onClose, onVoided }: { saleId: string; saleNumber: string; onClose: () => void; onVoided: () => void }) {
  const toast = useToast();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<VoidSaleValues>({ resolver: zodResolver(voidSaleSchema), defaultValues: { reason: '' } });

  const onSubmit = async ({ reason }: VoidSaleValues) => {
    try {
      const result = await saleApi.void(saleId, reason);
      toast.success(result.message ?? 'Sale voided');
      onVoided();
      onClose();
    } catch (error) {
      if (!applyServerErrors(error, setError, ['reason'])) setError('reason', { message: getErrorMessage(error) });
    }
  };

  return (
    <Modal open title={`Void ${saleNumber}?`} description="Voiding returns every item to stock. This cannot be undone." onClose={onClose} size="sm">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <Field label="Reason" htmlFor="void-reason" error={errors.reason?.message} required>
          <Input id="void-reason" placeholder="e.g. Customer cancelled order" {...register('reason')} {...errorProps('void-reason', errors.reason?.message)} />
        </Field>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Keep sale
          </Button>
          <Button type="submit" variant="danger" loading={isSubmitting}>
            Void sale
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function SaleDetailsPage() {
  const { id = '' } = useParams();
  const sale = useApi(() => saleApi.get(id), [id]);
  const [voidOpen, setVoidOpen] = useState(false);
  useDocumentTitle(sale.data ? `Sale ${sale.data.saleNumber}` : 'Sale');

  if (sale.status === 404 || sale.status === 400) {
    return <NotFoundPage embedded title="Sale not found" message={sale.error ?? undefined} />;
  }

  const back = (
    <Link to="/sales" className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-leaf-700 hover:underline print:hidden">
      <ArrowLeft className="size-4" /> Sales history
    </Link>
  );

  if (sale.loading) {
    return (
      <>
        <PageHeader title="Sale" back={back} />
        <LoadingState rows={5} />
      </>
    );
  }
  if (sale.error || !sale.data) {
    return (
      <>
        <PageHeader title="Sale" back={back} />
        <ErrorState message={sale.error ?? 'Not found'} onRetry={sale.refetch} />
      </>
    );
  }

  const s = sale.data;
  const items = s.items ?? [];
  const customer = typeof s.customer === 'object' ? s.customer : null;
  // Derived: VAT-exclusive amount and unit count
  const vatableSales = s.total - s.vatAmount;
  const units = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <>
      <PageHeader
        title={s.saleNumber}
        back={back}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {formatDateTime(s.createdAt)} <SaleStatusBadge status={s.status} />
          </span>
        }
        actions={
          <div className="flex gap-2 print:hidden">
            <Button variant="secondary" onClick={() => window.print()} icon={<Printer className="size-4" />}>
              Print
            </Button>
            {s.status === 'completed' && (
              <Button variant="danger" onClick={() => setVoidOpen(true)} icon={<Ban className="size-4" />}>
                Void sale
              </Button>
            )}
          </div>
        }
      />

      {s.status === 'voided' && (
        <div role="status" className="mb-6 rounded-2xl bg-barn-50 px-5 py-4 text-sm text-barn-700 ring-1 ring-barn-100">
          <p className="font-semibold">This sale was voided{s.voidedAt ? ` on ${formatDateTime(s.voidedAt)}` : ''}.</p>
          <p className="mt-0.5">Reason: {s.voidReason || 'Not given'}. All items were returned to stock.</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Items" description={`${units} unit${units === 1 ? '' : 's'} across ${items.length} product${items.length === 1 ? '' : 's'}`} />
          <ul className="divide-y divide-line/70">
            {items.map((item) => (
              <li key={item._id} className="flex items-start justify-between gap-4 px-5 py-3.5">
                <div className="min-w-0">
                  <Link to={`/products/${item.product}`} className="font-semibold hover:text-leaf-700">
                    {item.productName}
                  </Link>
                  <p className="text-sm text-ink-500 tabular">
                    {item.quantity} {unitLabel(item.unit, item.quantity)} × {formatPeso(item.unitPrice)}, {item.sku}
                  </p>
                </div>
                <p className="shrink-0 font-semibold tabular">{formatPeso(item.lineTotal)}</p>
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Payment" />
            <dl className="space-y-2 px-5 py-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-500">Subtotal</dt>
                <dd className="tabular">{formatPeso(s.subtotal)}</dd>
              </div>
              {s.discountAmount > 0 && (
                <div className="flex justify-between text-leaf-700">
                  <dt>Discount {s.discountType === 'percent' ? `(${s.discountValue}%)` : ''}</dt>
                  <dd className="tabular">−{formatPeso(s.discountAmount)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-dashed border-ink-300 pt-2 font-display text-xl font-bold text-pasture-900">
                <dt>Total</dt>
                <dd className="tabular">{formatPeso(s.total)}</dd>
              </div>
              <div className="flex justify-between text-ink-500">
                <dt>VATable sales</dt>
                <dd className="tabular">{formatPeso(vatableSales)}</dd>
              </div>
              <div className="flex justify-between text-ink-500">
                <dt>VAT (12%)</dt>
                <dd className="tabular">{formatPeso(s.vatAmount)}</dd>
              </div>
              <div className="flex justify-between border-t border-line/70 pt-2">
                <dt className="text-ink-500">Paid by {paymentLabel[s.paymentMethod]}</dt>
                <dd className="tabular">{formatPeso(s.amountTendered)}</dd>
              </div>
              {s.paymentMethod === 'cash' && (
                <div className="flex justify-between font-semibold">
                  <dt>Change</dt>
                  <dd className="tabular">{formatPeso(s.change)}</dd>
                </div>
              )}
            </dl>
          </Card>
          <Card className="p-5 text-sm">
            <p className="text-ink-500">Customer</p>
            <p className="mt-0.5 font-semibold">{s.customerName}</p>
            {customer && (
              <p className="text-ink-500">
                {customer.phone}, {customer.customerType}
              </p>
            )}
            {s.notes && (
              <>
                <p className="mt-4 text-ink-500">Notes</p>
                <p className="mt-0.5">{s.notes}</p>
              </>
            )}
            <p className="mt-4 text-ink-500">Gross profit</p>
            <p className="mt-0.5 font-semibold tabular">{formatPeso(s.grossProfit)}</p>
          </Card>
        </div>
      </div>

      {voidOpen && <VoidSaleModal saleId={s._id} saleNumber={s.saleNumber} onClose={() => setVoidOpen(false)} onVoided={sale.refresh} />}
    </>
  );
}
