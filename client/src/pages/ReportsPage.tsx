import { AlertTriangle, CalendarClock, PackageCheck, Trophy } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { reportApi } from '../api';
import { RevenueChart } from '../components/charts/RevenueChart';
import { ShareBars } from '../components/charts/ShareBars';
import { categoryDotClass, StockBadge } from '../components/ui/Badge';
import { Card, CardHeader } from '../components/ui/Card';
import { Input } from '../components/ui/Field';
import { PageHeader } from '../components/ui/PageHeader';
import { StatCard } from '../components/ui/StatCard';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States';
import { useApi } from '../hooks/useApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { formatDate, formatDayKey, formatNumber, formatPeso, paymentLabel, storeDateKey, unitLabel } from '../utils/format';

const PRESETS = [
  { id: '7', label: '7 days', days: 7 },
  { id: '30', label: '30 days', days: 30 },
  { id: '90', label: '90 days', days: 90 },
];

const paymentBarClass: Record<string, string> = { cash: 'bg-leaf-500', gcash: 'bg-sky-500', card: 'bg-violet-500' };

type Tab = 'sales' | 'inventory';
type RankBy = 'quantity' | 'revenue' | 'profit';

function SalesReports() {
  const [from, setFrom] = useState(storeDateKey(-29));
  const [to, setTo] = useState(storeDateKey(0));
  const [rankBy, setRankBy] = useState<RankBy>('quantity');
  const rangeInvalid = from > to;

  const summary = useApi(() => reportApi.salesSummary({ from, to }), [from, to]);
  const top = useApi(() => reportApi.topProducts({ from, to, limit: 10, sortBy: rankBy }), [from, to, rankBy]);
  const categories = useApi(() => reportApi.categorySales({ from, to }), [from, to]);

  const applyPreset = (days: number) => {
    setFrom(storeDateKey(-(days - 1)));
    setTo(storeDateKey(0));
  };
  const activePreset = PRESETS.find((preset) => from === storeDateKey(-(preset.days - 1)) && to === storeDateKey(0))?.id;

  return (
    <div className="space-y-6">
      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex rounded-xl bg-canvas p-1" role="group" aria-label="Quick date range">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.days)}
              aria-pressed={activePreset === preset.id}
              className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold sm:flex-none ${
                activePreset === preset.id ? 'bg-surface text-pasture-900 shadow-sm' : 'text-ink-500 hover:text-ink-900'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <Input type="date" value={from} max={to} onChange={(e) => e.target.value && setFrom(e.target.value)} aria-label="From date" />
          <Input type="date" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} aria-label="To date" />
        </div>
      </Card>
      {rangeInvalid && <p className="text-sm text-barn-600">The start date must be on or before the end date.</p>}

      {summary.loading ? (
        <LoadingState rows={4} label="Loading sales summary" />
      ) : summary.error || !summary.data ? (
        <ErrorState message={summary.error ?? 'No data'} onRetry={summary.refetch} />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Revenue" value={formatPeso(summary.data.revenue)} icon={<PackageCheck className="size-5" />} footnote={`${formatPeso(summary.data.averageDailyRevenue)} per day on average`} />
            <StatCard
              label="Gross profit"
              value={formatPeso(summary.data.grossProfit)}
              tone="pasture"
              icon={<Trophy className="size-5" />}
              footnote={`${summary.data.profitMargin}% margin after ${formatPeso(summary.data.totalDiscounts)} in discounts`}
            />
            <StatCard
              label="Completed sales"
              value={formatNumber(summary.data.salesCount)}
              tone="grain"
              icon={<CalendarClock className="size-5" />}
              footnote={`${formatNumber(summary.data.itemsSold)} items, ${formatPeso(summary.data.averageSale)} average`}
            />
            <StatCard
              label="Voided"
              value={formatNumber(summary.data.voidedCount)}
              tone="barn"
              icon={<AlertTriangle className="size-5" />}
              footnote={`${formatPeso(summary.data.voidedAmount)} reversed`}
            />
          </div>

          <Card>
            <CardHeader
              title="Daily revenue and profit"
              description={`${formatDayKey(summary.data.range.from)} to ${formatDayKey(summary.data.range.to)}, ${summary.data.range.days} days`}
            />
            <div className="px-3 py-4 sm:px-5">
              <RevenueChart data={summary.data.daily} showProfit height={300} />
            </div>
            <div className="grid gap-4 border-t border-line/70 px-5 py-4 text-sm sm:grid-cols-3">
              <div>
                <p className="text-ink-500">Best day</p>
                <p className="font-semibold tabular">
                  {summary.data.bestDay ? `${formatDayKey(summary.data.bestDay.date)}, ${formatPeso(summary.data.bestDay.revenue)}` : 'No sales'}
                </p>
              </div>
              <div>
                <p className="text-ink-500">Highest sale</p>
                {summary.data.highestSale ? (
                  <Link to={`/sales/${summary.data.highestSale._id}`} className="font-semibold text-leaf-700 tabular hover:underline">
                    {formatPeso(summary.data.highestSale.total)}, {summary.data.highestSale.customerName}
                  </Link>
                ) : (
                  <p className="font-semibold">None</p>
                )}
              </div>
              <div>
                <p className="text-ink-500">Lowest sale</p>
                {summary.data.lowestSale ? (
                  <Link to={`/sales/${summary.data.lowestSale._id}`} className="font-semibold text-leaf-700 tabular hover:underline">
                    {formatPeso(summary.data.lowestSale.total)}, {summary.data.lowestSale.customerName}
                  </Link>
                ) : (
                  <p className="font-semibold">None</p>
                )}
              </div>
            </div>
          </Card>
        </>
      )}

      <Card>
        <CardHeader
          title="Top-selling products"
          description="Ranked from completed sales in this range"
          action={
            <div className="flex rounded-xl bg-canvas p-1 text-sm" role="group" aria-label="Rank by">
              {(['quantity', 'revenue', 'profit'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRankBy(key)}
                  aria-pressed={rankBy === key}
                  className={`rounded-lg px-3 py-1.5 font-semibold ${rankBy === key ? 'bg-surface text-pasture-900 shadow-sm' : 'text-ink-500 hover:text-ink-900'}`}
                >
                  {key === 'quantity' ? 'Units' : key === 'revenue' ? 'Revenue' : 'Profit'}
                </button>
              ))}
            </div>
          }
        />
        {top.loading ? (
          <div className="p-5">
            <LoadingState rows={5} />
          </div>
        ) : top.error ? (
          <div className="p-5">
            <ErrorState message={top.error} onRetry={top.refetch} />
          </div>
        ) : !top.data?.products.length ? (
          <EmptyState icon={<Trophy className="size-6" />} title="No sales in this range" message="Pick a wider date range to see rankings." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="border-b border-line bg-canvas/60 text-ink-500">
                <tr>
                  <th className="w-14 px-5 py-3 font-semibold">Rank</th>
                  <th className="px-3 py-3 font-semibold">Product</th>
                  <th className="px-3 py-3 text-right font-semibold">Units</th>
                  <th className="px-3 py-3 text-right font-semibold">Revenue</th>
                  <th className="px-3 py-3 text-right font-semibold">Profit</th>
                  <th className="px-5 py-3 font-semibold">Stock now</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {top.data.products.map((row) => (
                  <tr key={row.productId}>
                    <td className="px-5 py-3">
                      <span
                        className={`flex size-8 items-center justify-center rounded-lg font-display font-bold ${
                          row.rank <= 3 ? 'bg-grain-400 text-pasture-950' : 'bg-pasture-50 text-pasture-800'
                        }`}
                      >
                        {row.rank}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <Link to={`/products/${row.productId}`} className="font-semibold hover:text-leaf-700">
                        {row.productName}
                      </Link>
                      <p className="text-ink-500">{row.revenueShare}% of product revenue</p>
                    </td>
                    <td className="px-3 py-3 text-right tabular">
                      {row.quantitySold} {unitLabel(row.unit, row.quantitySold)}
                    </td>
                    <td className="px-3 py-3 text-right tabular">{formatPeso(row.revenue)}</td>
                    <td className="px-3 py-3 text-right tabular">
                      {formatPeso(row.profit)}
                      <p className="text-xs text-ink-500">{row.marginPercent}% margin</p>
                    </td>
                    <td className="px-5 py-3">{row.stockStatus ? <StockBadge status={row.stockStatus} /> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Sales by category" description="Line totals before sale-level discounts" />
          <div className="px-5 py-5">
            {categories.loading ? (
              <LoadingState rows={3} />
            ) : categories.error ? (
              <ErrorState message={categories.error} onRetry={categories.refetch} />
            ) : !categories.data?.categories.length ? (
              <p className="text-sm text-ink-500">No category sales in this range.</p>
            ) : (
              <ShareBars
                rows={categories.data.categories.map((category) => ({
                  id: category.categoryId,
                  label: category.name,
                  value: `${formatPeso(category.revenue)} (${category.share}%)`,
                  share: category.share,
                  barClass: categoryDotClass[category.color],
                }))}
              />
            )}
          </div>
        </Card>
        <Card>
          <CardHeader title="Payment methods" description="Share of completed revenue" />
          <div className="px-5 py-5">
            {summary.data && summary.data.salesCount > 0 ? (
              <ShareBars
                rows={summary.data.paymentBreakdown.map((row) => ({
                  id: row.method,
                  label: `${paymentLabel[row.method]}, ${row.count} sale${row.count === 1 ? '' : 's'}`,
                  value: `${formatPeso(row.amount)} (${row.share}%)`,
                  share: row.share,
                  barClass: paymentBarClass[row.method],
                }))}
              />
            ) : (
              <p className="text-sm text-ink-500">{summary.loading ? 'Loading…' : 'No completed sales in this range.'}</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function InventoryReports() {
  const report = useApi(() => reportApi.inventory(), []);

  if (report.loading) return <LoadingState rows={5} label="Loading inventory report" />;
  if (report.error || !report.data) return <ErrorState message={report.error ?? 'No data'} onRetry={report.refetch} />;

  const data = report.data;
  // Derived: total cost to restock everything that is low
  const restockCost = data.lowStock.reduce((sum, item) => sum + item.estimatedReorderCost, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Stock value at cost" value={formatPeso(data.costValue)} icon={<PackageCheck className="size-5" />} footnote={`${formatNumber(data.totalUnits)} units in ${data.productCount} products`} />
        <StatCard label="Value at shelf price" value={formatPeso(data.retailValue)} tone="pasture" icon={<Trophy className="size-5" />} footnote={`${formatPeso(data.potentialProfit)} potential profit`} />
        <StatCard
          label="Low or out of stock"
          value={formatNumber(data.statusCounts.low + data.statusCounts.out)}
          tone="grain"
          icon={<AlertTriangle className="size-5" />}
          footnote={`${data.statusCounts.out} out, ${data.statusCounts.low} low, ${data.statusCounts.ok} healthy`}
        />
        <StatCard label="Expiry alerts" value={formatNumber(data.expiryAlerts.length)} tone="barn" icon={<CalendarClock className="size-5" />} footnote={`Expired or within ${data.nearExpiryDays} days`} />
      </div>

      <Card>
        <CardHeader title="Reorder list" description={data.lowStock.length ? `About ${formatPeso(restockCost)} to bring every item back to a healthy level` : undefined} />
        {data.lowStock.length === 0 ? (
          <EmptyState icon={<PackageCheck className="size-6" />} title="Nothing to reorder" message="Every product is above its reorder level." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-sm">
              <thead className="border-b border-line bg-canvas/60 text-ink-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Product</th>
                  <th className="px-3 py-3 text-right font-semibold">Stock / reorder at</th>
                  <th className="px-3 py-3 text-right font-semibold">Order</th>
                  <th className="px-3 py-3 text-right font-semibold">Est. cost</th>
                  <th className="px-5 py-3 font-semibold">Supplier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {data.lowStock.map((item) => (
                  <tr key={item._id}>
                    <td className="px-5 py-3">
                      <Link to={`/products/${item._id}`} className="font-semibold hover:text-leaf-700">
                        {item.name}
                      </Link>
                      <div className="mt-1">
                        <StockBadge status={item.stockStatus} />
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right tabular">
                      {item.stock} / {item.reorderLevel}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold tabular">
                      {item.suggestedReorderQty} {unitLabel(item.unit, item.suggestedReorderQty)}
                    </td>
                    <td className="px-3 py-3 text-right tabular">{formatPeso(item.estimatedReorderCost)}</td>
                    <td className="px-5 py-3">
                      {item.supplier ? (
                        <>
                          <p>{item.supplier.name}</p>
                          <p className="text-ink-500">
                            {item.supplier.phone}, {item.supplier.leadTimeDays}-day delivery
                          </p>
                        </>
                      ) : (
                        <span className="text-ink-500">No supplier</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Stock value by category" description="At shelf price" />
          <div className="px-5 py-5">
            <ShareBars
              rows={data.categories.map((category) => ({
                id: category.categoryId ?? category.name,
                label: `${category.name} (${category.productCount})`,
                value: `${formatPeso(category.retailValue)} (${category.valueShare}%)`,
                share: category.valueShare,
                barClass: categoryDotClass[category.color],
              }))}
            />
          </div>
        </Card>
        <Card>
          <CardHeader title="Expiry alerts" description={`Expired or expiring within ${data.nearExpiryDays} days`} />
          {data.expiryAlerts.length === 0 ? (
            <EmptyState icon={<CalendarClock className="size-6" />} title="No expiry alerts" message="Nothing expires in the next few weeks." />
          ) : (
            <ul className="divide-y divide-line/70">
              {data.expiryAlerts.map((item) => (
                <li key={item._id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <Link to={`/products/${item._id}`} className="block truncate font-medium hover:text-leaf-700">
                      {item.name}
                    </Link>
                    <p className="text-sm text-ink-500">
                      {item.stock} on hand, {formatDate(item.expiryDate)}
                    </p>
                  </div>
                  <span className={`shrink-0 text-sm font-semibold ${item.daysLeft < 0 ? 'text-barn-600' : 'text-grain-700'}`}>
                    {item.daysLeft < 0 ? `Expired ${Math.abs(item.daysLeft)}d ago` : `${item.daysLeft} days left`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  useDocumentTitle('Reports');
  const [tab, setTab] = useState<Tab>('sales');

  return (
    <>
      <PageHeader title="Reports" description="Sales performance, best sellers, stock value and what to reorder." />
      <div className="mb-6 flex gap-1 border-b border-line" role="tablist" aria-label="Report type">
        {(
          [
            { id: 'sales', label: 'Sales' },
            { id: 'inventory', label: 'Inventory' },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={`-mb-px border-b-2 px-4 py-2.5 font-semibold ${
              tab === item.id ? 'border-leaf-600 text-pasture-900' : 'border-transparent text-ink-500 hover:text-ink-900'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {tab === 'sales' ? <SalesReports /> : <InventoryReports />}
    </>
  );
}
