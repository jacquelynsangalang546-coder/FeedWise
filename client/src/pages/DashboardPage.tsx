import { AlertTriangle, ArrowDownRight, ArrowUpRight, Boxes, CalendarRange, PackageX, ShoppingCart, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { productApi, reportApi } from '../api';
import { RevenueChart } from '../components/charts/RevenueChart';
import { SaleStatusBadge, StockBadge } from '../components/ui/Badge';
import { ButtonLink } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States';
import { useApi } from '../hooks/useApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { formatDateTime, formatNumber, formatPeso, paymentLabel, unitLabel } from '../utils/format';

function greeting() {
  const hour = Number(new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Manila' }));
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage() {
  useDocumentTitle('Dashboard');
  const dashboard = useApi(() => reportApi.dashboard(), []);
  const lowStock = useApi(() => productApi.lowStock(), []);

  const todayLabel = new Date().toLocaleDateString('en-PH', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Manila',
  });

  const header = (
    <PageHeader
      title={greeting()}
      description={`Here is how the store is doing on ${todayLabel}.`}
      actions={
        <ButtonLink to="/sales/new" icon={<ShoppingCart className="size-4" />}>
          New sale
        </ButtonLink>
      }
    />
  );

  if (dashboard.loading) {
    return (
      <>
        {header}
        <LoadingState rows={6} label="Loading dashboard" />
      </>
    );
  }
  if (dashboard.error || !dashboard.data) {
    return (
      <>
        {header}
        <ErrorState message={dashboard.error ?? 'No data'} onRetry={dashboard.refetch} />
      </>
    );
  }

  const { today, month, inventory, last7Days, topProducts, recentSales } = dashboard.data;
  // Derived values, computed during render
  const weekRevenue = last7Days.reduce((sum, day) => sum + day.revenue, 0);
  const attentionCount = inventory.lowStock + inventory.outOfStock;
  const change = today.changeVsYesterday;

  return (
    <>
      {header}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Sales today"
          value={formatPeso(today.revenue)}
          icon={<Wallet className="size-5" />}
          footnote={
            <span className="flex flex-wrap items-center gap-x-2">
              {today.salesCount} sale{today.salesCount === 1 ? '' : 's'}, {today.itemsSold} items
              {change !== null && (
                <span className={`inline-flex items-center font-semibold ${change >= 0 ? 'text-leaf-700' : 'text-barn-600'}`}>
                  {change >= 0 ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
                  {Math.abs(change)}% vs yesterday
                </span>
              )}
            </span>
          }
        />
        <StatCard
          label="This month"
          value={formatPeso(month.revenue)}
          tone="pasture"
          icon={<CalendarRange className="size-5" />}
          footnote={`${formatPeso(month.grossProfit)} gross profit from ${month.salesCount} sales`}
        />
        <StatCard
          label="Stock value at cost"
          value={formatPeso(inventory.valueAtCost)}
          tone="grain"
          icon={<Boxes className="size-5" />}
          footnote={`${inventory.activeProducts} active products`}
        />
        <StatCard
          label="Needs attention"
          value={formatNumber(attentionCount)}
          tone="barn"
          icon={<PackageX className="size-5" />}
          footnote={`${inventory.outOfStock} out of stock, ${inventory.lowStock} low, ${inventory.nearExpiry} near expiry`}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Last 7 days" description={`${formatPeso(weekRevenue)} in completed sales`} />
          <div className="px-3 py-4 sm:px-5">
            <RevenueChart data={last7Days} />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Top sellers"
            description="By units sold, last 30 days"
            action={
              <Link to="/reports" className="text-sm font-semibold text-leaf-700 hover:underline">
                Full ranking
              </Link>
            }
          />
          {topProducts.length === 0 ? (
            <EmptyState icon={<ShoppingCart className="size-6" />} title="No sales yet" message="Top sellers appear after the first completed sale." />
          ) : (
            <ol className="divide-y divide-line/70">
              {topProducts.map((product) => (
                <li key={product.productId} className="flex items-center gap-3 px-5 py-3">
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-lg font-display font-bold ${
                      product.rank === 1 ? 'bg-grain-400 text-pasture-950' : 'bg-pasture-50 text-pasture-800'
                    }`}
                  >
                    {product.rank}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link to={`/products/${product.productId}`} className="block truncate font-medium hover:text-leaf-700">
                      {product.productName}
                    </Link>
                    <p className="text-sm text-ink-500 tabular">
                      {product.quantitySold} {unitLabel(product.unit, product.quantitySold)} · {formatPeso(product.revenue)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Reorder soon"
            description="At or below reorder level, most urgent first"
            action={
              <Link to="/products?stockStatus=low" className="text-sm font-semibold text-leaf-700 hover:underline">
                View products
              </Link>
            }
          />
          {lowStock.loading ? (
            <div className="p-5">
              <LoadingState rows={3} />
            </div>
          ) : lowStock.error ? (
            <div className="p-5">
              <ErrorState message={lowStock.error} onRetry={lowStock.refetch} />
            </div>
          ) : !lowStock.data?.length ? (
            <EmptyState icon={<Boxes className="size-6" />} title="Shelves look healthy" message="No product is at or below its reorder level." />
          ) : (
            <ul className="divide-y divide-line/70">
              {lowStock.data.slice(0, 6).map((product) => (
                <li key={product._id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <Link to={`/products/${product._id}`} className="block truncate font-medium hover:text-leaf-700">
                      {product.name}
                    </Link>
                    <p className="text-sm text-ink-500 tabular">
                      {product.stock} left, reorder at {product.reorderLevel} · order {product.suggestedReorderQty}
                    </p>
                  </div>
                  <StockBadge status={product.stockStatus} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Recent sales"
            action={
              <Link to="/sales" className="text-sm font-semibold text-leaf-700 hover:underline">
                All sales
              </Link>
            }
          />
          {recentSales.length === 0 ? (
            <EmptyState
              icon={<AlertTriangle className="size-6" />}
              title="No sales recorded"
              message="Completed sales will be listed here."
              action={<ButtonLink to="/sales/new">Start a sale</ButtonLink>}
            />
          ) : (
            <ul className="divide-y divide-line/70">
              {recentSales.map((sale) => (
                <li key={sale._id}>
                  <Link to={`/sales/${sale._id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-pasture-50/60">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{sale.customerName}</p>
                      <p className="text-sm text-ink-500">
                        {formatDateTime(sale.createdAt)} · {paymentLabel[sale.paymentMethod]}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className={`font-semibold tabular ${sale.status === 'voided' ? 'text-ink-400 line-through' : ''}`}>
                        {formatPeso(sale.total)}
                      </span>
                      {sale.status === 'voided' && <SaleStatusBadge status={sale.status} />}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
