import { ArrowLeft, CalendarClock, Pencil, SlidersHorizontal, Truck } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { productApi } from '../api';
import { AdjustStockModal } from '../components/products/AdjustStockModal';
import { CategoryBadge, ExpiryBadge, StockBadge } from '../components/ui/Badge';
import { Button, ButtonLink } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { ErrorState, LoadingState } from '../components/ui/States';
import { useApi } from '../hooks/useApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { capitalize, formatDate, formatPeso, unitLabel } from '../utils/format';
import NotFoundPage from './NotFoundPage';

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2.5">
      <dt className="text-ink-500">{label}</dt>
      <dd className="text-right font-medium tabular">{children}</dd>
    </div>
  );
}

export default function ProductDetailsPage() {
  const { id = '' } = useParams();
  const product = useApi(() => productApi.get(id), [id]);
  const [adjustOpen, setAdjustOpen] = useState(false);
  useDocumentTitle(product.data?.name ?? 'Product');

  if (product.status === 404 || product.status === 400) {
    return <NotFoundPage embedded title="Product not found" message={product.error ?? undefined} />;
  }

  const back = (
    <Link to="/products" className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-leaf-700 hover:underline">
      <ArrowLeft className="size-4" /> Products
    </Link>
  );

  if (product.loading) {
    return (
      <>
        <PageHeader title="Product" back={back} />
        <LoadingState rows={5} />
      </>
    );
  }
  if (product.error || !product.data) {
    return (
      <>
        <PageHeader title="Product" back={back} />
        <ErrorState message={product.error ?? 'Not found'} onRetry={product.refetch} />
      </>
    );
  }

  const p = product.data;
  // Derived values
  const stockPercent = Math.min((p.stock / Math.max(p.reorderLevel * 2, 1)) * 100, 100);
  const daysToExpiry = p.expiryDate ? Math.ceil((new Date(p.expiryDate).getTime() - Date.now()) / 86_400_000) : null;
  const stockValue = p.stock * p.costPrice;

  return (
    <>
      <PageHeader
        title={p.name}
        back={back}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span>{p.sku}</span>
            {p.category && <CategoryBadge name={p.category.name} color={p.category.color} />}
            <StockBadge status={p.stockStatus} />
            <ExpiryBadge status={p.expiryStatus} />
            {!p.isActive && <span className="font-semibold text-barn-600">Archived</span>}
          </span>
        }
        actions={
          <>
            <Button variant="secondary" onClick={() => setAdjustOpen(true)} icon={<SlidersHorizontal className="size-4" />}>
              Adjust stock
            </Button>
            <ButtonLink to={`/products/${p._id}/edit`} icon={<Pencil className="size-4" />}>
              Edit
            </ButtonLink>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 sm:p-6 lg:col-span-2">
          <p className="text-sm font-medium text-ink-500">On hand</p>
          <p className="mt-1 font-display text-5xl font-bold text-pasture-900 tabular">
            {p.stock} <span className="text-2xl font-semibold text-ink-500">{unitLabel(p.unit, p.stock)}</span>
          </p>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-pasture-50" aria-hidden>
            <div
              className={`h-full rounded-full ${p.stockStatus === 'ok' ? 'bg-leaf-500' : p.stockStatus === 'low' ? 'bg-grain-400' : 'bg-barn-500'}`}
              style={{ width: `${Math.max(stockPercent, 2)}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-ink-500">
            Reorder level is {p.reorderLevel}. A healthy shelf holds about {p.reorderLevel * 2}.
          </p>

          <div className="mt-6 grid gap-4 border-t border-line/70 pt-5 sm:grid-cols-3">
            <div>
              <p className="text-sm text-ink-500">Sold to date</p>
              <p className="mt-1 text-xl font-semibold tabular">
                {p.lifetimeSold ?? 0} {unitLabel(p.unit, p.lifetimeSold ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-ink-500">Revenue to date</p>
              <p className="mt-1 text-xl font-semibold tabular">{formatPeso(p.lifetimeRevenue ?? 0)}</p>
            </div>
            <div>
              <p className="text-sm text-ink-500">Stock value at cost</p>
              <p className="mt-1 text-xl font-semibold tabular">{formatPeso(stockValue)}</p>
            </div>
          </div>
          {p.description && <p className="mt-6 border-t border-line/70 pt-5 text-ink-700">{p.description}</p>}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Pricing" />
            <dl className="divide-y divide-line/70 px-5 py-1 text-sm">
              <Detail label="Selling price">{formatPeso(p.sellingPrice)}</Detail>
              <Detail label="Cost price">{formatPeso(p.costPrice)}</Detail>
              <Detail label="Profit per unit">{formatPeso(p.sellingPrice - p.costPrice)}</Detail>
              <Detail label="Margin">{p.marginPercent}%</Detail>
              <Detail label="For">{capitalize(p.animalType)}</Detail>
            </dl>
          </Card>
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <Truck className="mt-0.5 size-5 text-leaf-600" aria-hidden />
              <div className="text-sm">
                <p className="font-semibold">{p.supplier?.name ?? 'No supplier set'}</p>
                {p.supplier?.contactPerson && (
                  <p className="text-ink-500">
                    {p.supplier.contactPerson}, {p.supplier.phone}
                  </p>
                )}
                {p.supplier?.leadTimeDays !== undefined && (
                  <p className="text-ink-500">Delivers in about {p.supplier.leadTimeDays} days</p>
                )}
              </div>
            </div>
            <div className="mt-4 flex items-start gap-3 border-t border-line/70 pt-4">
              <CalendarClock className="mt-0.5 size-5 text-leaf-600" aria-hidden />
              <div className="text-sm">
                {p.expiryDate ? (
                  <>
                    <p className="font-semibold">Expires {formatDate(p.expiryDate)}</p>
                    <p className={daysToExpiry !== null && daysToExpiry < 0 ? 'text-barn-600' : 'text-ink-500'}>
                      {daysToExpiry !== null && daysToExpiry < 0
                        ? `Expired ${Math.abs(daysToExpiry)} days ago. Remove from the shelf.`
                        : `${daysToExpiry} days left`}
                    </p>
                  </>
                ) : (
                  <p className="text-ink-500">No expiry date</p>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {adjustOpen && <AdjustStockModal product={p} onClose={() => setAdjustOpen(false)} onSaved={product.refresh} />}
    </>
  );
}
