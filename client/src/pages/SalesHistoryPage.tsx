import { ReceiptText, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { saleApi } from '../api';
import { SaleStatusBadge } from '../components/ui/Badge';
import { Button, ButtonLink } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input, Select } from '../components/ui/Field';
import { PageHeader } from '../components/ui/PageHeader';
import { SearchInput } from '../components/ui/SearchInput';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States';
import { useApi } from '../hooks/useApi';
import { useDebounce } from '../hooks/useDebounce';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { formatDateTime, formatPeso, paymentLabel } from '../utils/format';

export default function SalesHistoryPage() {
  useDocumentTitle('Sales history');
  const [params, setParams] = useSearchParams();
  const [searchText, setSearchText] = useState(params.get('search') ?? '');
  const search = useDebounce(searchText);
  const status = params.get('status') ?? '';
  const paymentMethod = params.get('paymentMethod') ?? '';
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';
  const customer = params.get('customer') ?? '';

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const sales = useApi(
    () => saleApi.list({ search, status, paymentMethod, from, to, customer }),
    [search, status, paymentMethod, from, to, customer]
  );

  const list = sales.data?.sales ?? [];
  const meta = sales.data?.meta ?? {};
  const dateError = from && to && from > to ? '"From" date must be before "To" date' : null;
  const filtersActive = Boolean(search || status || paymentMethod || from || to || customer);
  // Derived: average value of completed sales in the current view
  const averageSale = meta.completedCount ? (meta.totalRevenue ?? 0) / meta.completedCount : 0;

  const clearFilters = () => {
    setSearchText('');
    setParams(new URLSearchParams(), { replace: true });
  };

  return (
    <>
      <PageHeader
        title="Sales history"
        description="Every completed and voided sale, newest first."
        actions={
          <ButtonLink to="/sales/new" icon={<ShoppingCart className="size-4" />}>
            New sale
          </ButtonLink>
        }
      />

      <Card className="mb-5 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
          <SearchInput
            placeholder="Sale number or customer"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            aria-label="Search sales"
            className="sm:col-span-2 lg:col-span-1"
          />
          <Select value={status} onChange={(e) => setFilter('status', e.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            <option value="completed">Completed</option>
            <option value="voided">Voided</option>
          </Select>
          <Select value={paymentMethod} onChange={(e) => setFilter('paymentMethod', e.target.value)} aria-label="Filter by payment">
            <option value="">All payments</option>
            <option value="cash">Cash</option>
            <option value="gcash">GCash</option>
            <option value="card">Card</option>
          </Select>
          <Input type="date" value={from} max={to || undefined} onChange={(e) => setFilter('from', e.target.value)} aria-label="From date" />
          <Input type="date" value={to} min={from || undefined} onChange={(e) => setFilter('to', e.target.value)} aria-label="To date" />
        </div>
        {(filtersActive || dateError) && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-barn-600">{dateError ?? (customer ? 'Showing one customer’s purchases.' : '')}</span>
            <button type="button" onClick={clearFilters} className="font-semibold text-leaf-700 hover:underline">
              Clear filters
            </button>
          </div>
        )}
      </Card>

      {sales.loading ? (
        <LoadingState rows={6} label="Loading sales" />
      ) : sales.error ? (
        <ErrorState message={sales.error} onRetry={sales.refetch} />
      ) : list.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ReceiptText className="size-6" />}
            title={filtersActive ? 'No sales match these filters' : 'No sales yet'}
            message={filtersActive ? 'Try a wider date range or clear the filters.' : 'Completed sales will appear here.'}
            action={
              filtersActive ? (
                <Button variant="secondary" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : (
                <ButtonLink to="/sales/new">Start a sale</ButtonLink>
              )
            }
          />
        </Card>
      ) : (
        <>
          <p className="mb-3 text-sm text-ink-500 tabular">
            {list.length} sale{list.length === 1 ? '' : 's'} shown. Completed: {meta.completedCount ?? 0} worth{' '}
            <span className="font-semibold text-ink-900">{formatPeso(meta.totalRevenue ?? 0)}</span>, averaging {formatPeso(averageSale)}.
          </p>

          <Card className="hidden overflow-hidden md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-canvas/60 text-ink-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Sale</th>
                  <th className="px-3 py-3 font-semibold">Customer</th>
                  <th className="px-3 py-3 font-semibold">Payment</th>
                  <th className="px-3 py-3 text-right font-semibold">Items</th>
                  <th className="px-3 py-3 text-right font-semibold">Total</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {list.map((sale) => (
                  <tr key={sale._id} className="hover:bg-pasture-50/50">
                    <td className="px-5 py-3">
                      <Link to={`/sales/${sale._id}`} className="font-semibold text-ink-900 hover:text-leaf-700">
                        {sale.saleNumber}
                      </Link>
                      <p className="text-ink-500">{formatDateTime(sale.createdAt)}</p>
                    </td>
                    <td className="px-3 py-3">{sale.customerName}</td>
                    <td className="px-3 py-3">{paymentLabel[sale.paymentMethod]}</td>
                    <td className="px-3 py-3 text-right tabular">{sale.itemCount}</td>
                    <td className={`px-3 py-3 text-right font-semibold tabular ${sale.status === 'voided' ? 'text-ink-400 line-through' : ''}`}>
                      {formatPeso(sale.total)}
                      {sale.discountAmount > 0 && <p className="text-xs font-normal text-leaf-700 no-underline">−{formatPeso(sale.discountAmount)} off</p>}
                    </td>
                    <td className="px-5 py-3">
                      <SaleStatusBadge status={sale.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <ul className="space-y-3 md:hidden">
            {list.map((sale) => (
              <li key={sale._id}>
                <Link to={`/sales/${sale._id}`} className="block">
                  <Card className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">{sale.customerName}</p>
                        <p className="text-sm text-ink-500">{sale.saleNumber}</p>
                      </div>
                      <p className={`shrink-0 font-semibold tabular ${sale.status === 'voided' ? 'text-ink-400 line-through' : ''}`}>
                        {formatPeso(sale.total)}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm text-ink-500">
                      <span>
                        {formatDateTime(sale.createdAt)}, {paymentLabel[sale.paymentMethod]}
                      </span>
                      {sale.status === 'voided' && <SaleStatusBadge status={sale.status} />}
                    </div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
