import { Archive, ArchiveRestore, Boxes, PackagePlus, Pencil, SlidersHorizontal, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { categoryApi, productApi } from '../api';
import { AdjustStockModal } from '../components/products/AdjustStockModal';
import { CategoryBadge, ExpiryBadge, StockBadge } from '../components/ui/Badge';
import { Button, ButtonLink } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Select } from '../components/ui/Field';
import { PageHeader } from '../components/ui/PageHeader';
import { SearchInput } from '../components/ui/SearchInput';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States';
import { useToast } from '../context/ToastContext';
import { useApi } from '../hooks/useApi';
import { useDebounce } from '../hooks/useDebounce';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { ANIMAL_TYPES } from '../schemas/productSchema';
import type { Product } from '../types';
import { getErrorMessage } from '../utils/errors';
import { capitalize, formatNumber, formatPeso, unitLabel } from '../utils/format';

const SORT_OPTIONS = [
  { value: 'name', label: 'Name A–Z' },
  { value: '-name', label: 'Name Z–A' },
  { value: 'stock', label: 'Lowest stock' },
  { value: '-stock', label: 'Highest stock' },
  { value: 'price', label: 'Lowest price' },
  { value: '-price', label: 'Highest price' },
  { value: 'newest', label: 'Newest' },
];

function RowActions({
  product,
  onAdjust,
  onToggleActive,
  onDelete,
}: {
  product: Product;
  onAdjust: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  const iconButton = 'rounded-lg p-2 text-ink-500 hover:bg-pasture-50 hover:text-ink-900';
  return (
    <div className="flex items-center justify-end gap-0.5">
      <button type="button" className={iconButton} onClick={onAdjust} aria-label={`Adjust stock of ${product.name}`} title="Adjust stock">
        <SlidersHorizontal className="size-4" />
      </button>
      <Link to={`/products/${product._id}/edit`} className={iconButton} aria-label={`Edit ${product.name}`} title="Edit">
        <Pencil className="size-4" />
      </Link>
      <button
        type="button"
        className={iconButton}
        onClick={onToggleActive}
        aria-label={product.isActive ? `Archive ${product.name}` : `Restore ${product.name}`}
        title={product.isActive ? 'Archive' : 'Restore'}
      >
        {product.isActive ? <Archive className="size-4" /> : <ArchiveRestore className="size-4" />}
      </button>
      <button
        type="button"
        className={`${iconButton} hover:bg-barn-50 hover:text-barn-600`}
        onClick={onDelete}
        aria-label={`Delete ${product.name}`}
        title="Delete"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

export default function ProductsPage() {
  useDocumentTitle('Products');
  const toast = useToast();
  // Filters live in the URL so they survive refresh and can be linked to (e.g. ?stockStatus=low)
  const [params, setParams] = useSearchParams();
  const [searchText, setSearchText] = useState(params.get('search') ?? '');
  const search = useDebounce(searchText);

  const category = params.get('category') ?? '';
  const animalType = params.get('animalType') ?? '';
  const stockStatus = params.get('stockStatus') ?? '';
  const sort = params.get('sort') ?? 'name';
  const status = params.get('status') ?? 'active';
  const supplier = params.get('supplier') ?? '';

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const categories = useApi(() => categoryApi.list(), []);
  const products = useApi(
    () => productApi.list({ search, category, supplier, animalType, stockStatus, sort, status }),
    [search, category, supplier, animalType, stockStatus, sort, status]
  );

  const [adjusting, setAdjusting] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const list = products.data ?? [];
  // Derived summary values
  const totalUnits = list.reduce((sum, product) => sum + product.stock, 0);
  const retailValue = list.reduce((sum, product) => sum + product.stock * product.sellingPrice, 0);
  const needsReorder = list.filter((product) => product.stockStatus !== 'ok').length;
  const filtersActive = Boolean(search || category || supplier || animalType || stockStatus || status !== 'active');

  const toggleActive = async (product: Product) => {
    try {
      await productApi.setActive(product._id, !product.isActive);
      toast.success(product.isActive ? `${product.name} archived` : `${product.name} restored`);
      products.refresh();
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletePending(true);
    try {
      await productApi.remove(deleting._id);
      toast.success(`${deleting.name} deleted`);
      setDeleting(null);
      products.refresh();
    } catch (error) {
      toast.error(getErrorMessage(error));
      setDeleting(null);
    } finally {
      setDeletePending(false);
    }
  };

  const clearFilters = () => {
    setSearchText('');
    setParams(new URLSearchParams(), { replace: true });
  };

  return (
    <>
      <PageHeader
        title="Products"
        description="Search the catalog, watch stock levels and adjust inventory."
        actions={
          <ButtonLink to="/products/new" icon={<PackagePlus className="size-4" />}>
            Add product
          </ButtonLink>
        }
      />

      <Card className="mb-5 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
          <SearchInput
            placeholder="Search by name or SKU"
            value={searchText}
            onChange={(event) => {
              setSearchText(event.target.value);
              setFilter('search', event.target.value);
            }}
            aria-label="Search products"
            className="sm:col-span-2 lg:col-span-1"
          />
          <Select value={category} onChange={(e) => setFilter('category', e.target.value)} aria-label="Filter by category">
            <option value="">All categories</option>
            {categories.data?.map((item) => (
              <option key={item._id} value={item._id}>
                {item.name}
              </option>
            ))}
          </Select>
          <Select value={animalType} onChange={(e) => setFilter('animalType', e.target.value)} aria-label="Filter by animal">
            <option value="">All animals</option>
            {ANIMAL_TYPES.map((type) => (
              <option key={type} value={type}>
                {capitalize(type)}
              </option>
            ))}
          </Select>
          <Select value={stockStatus} onChange={(e) => setFilter('stockStatus', e.target.value)} aria-label="Filter by stock">
            <option value="">Any stock level</option>
            <option value="ok">In stock</option>
            <option value="low">Low stock</option>
            <option value="out">Out of stock</option>
          </Select>
          <Select value={sort} onChange={(e) => setFilter('sort', e.target.value === 'name' ? '' : e.target.value)} aria-label="Sort products">
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex rounded-xl bg-canvas p-1" role="group" aria-label="Product status">
            {[
              { value: 'active', label: 'Active' },
              { value: 'archived', label: 'Archived' },
              { value: 'all', label: 'All' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter('status', option.value === 'active' ? '' : option.value)}
                aria-pressed={status === option.value}
                className={`rounded-lg px-3 py-1.5 font-semibold ${
                  status === option.value ? 'bg-surface text-pasture-900 shadow-sm' : 'text-ink-500 hover:text-ink-900'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {supplier && list.length > 0 && <span className="text-ink-500">Supplied by {list[0].supplier?.name}</span>}
            {filtersActive && (
              <button type="button" onClick={clearFilters} className="font-semibold text-leaf-700 hover:underline">
                Clear filters
              </button>
            )}
          </div>
        </div>
      </Card>

      {products.loading ? (
        <LoadingState rows={6} label="Loading products" />
      ) : products.error ? (
        <ErrorState message={products.error} onRetry={products.refetch} />
      ) : list.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Boxes className="size-6" />}
            title={filtersActive ? 'No products match these filters' : 'No products yet'}
            message={filtersActive ? 'Try a different search or clear the filters.' : 'Add your first product to start tracking stock.'}
            action={
              filtersActive ? (
                <Button variant="secondary" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : (
                <ButtonLink to="/products/new">Add product</ButtonLink>
              )
            }
          />
        </Card>
      ) : (
        <>
          <p className="mb-3 text-sm text-ink-500 tabular">
            {list.length} product{list.length === 1 ? '' : 's'}, {formatNumber(totalUnits)} units on hand worth{' '}
            {formatPeso(retailValue)} at shelf price. {needsReorder > 0 && <span className="font-semibold text-grain-700">{needsReorder} need reordering.</span>}
          </p>

          {/* Desktop table */}
          <Card className="hidden overflow-hidden md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-canvas/60 text-ink-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Product</th>
                  <th className="px-3 py-3 font-semibold">Category</th>
                  <th className="px-3 py-3 text-right font-semibold">Price</th>
                  <th className="px-3 py-3 text-right font-semibold">Stock</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {list.map((product) => (
                  <tr key={product._id} className={`hover:bg-pasture-50/50 ${product.isActive ? '' : 'opacity-60'}`}>
                    <td className="px-5 py-3">
                      <Link to={`/products/${product._id}`} className="font-semibold text-ink-900 hover:text-leaf-700">
                        {product.name}
                      </Link>
                      <p className="text-ink-500">
                        {product.sku}
                        {!product.isActive && ' (archived)'}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      {product.category && <CategoryBadge name={product.category.name} color={product.category.color} />}
                    </td>
                    <td className="px-3 py-3 text-right tabular">
                      {formatPeso(product.sellingPrice)}
                      <p className="text-xs text-ink-500">per {product.unit}</p>
                    </td>
                    <td className="px-3 py-3 text-right tabular">
                      <span className="font-semibold">{product.stock}</span>
                      <p className="text-xs text-ink-500">reorder at {product.reorderLevel}</p>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        <StockBadge status={product.stockStatus} />
                        <ExpiryBadge status={product.expiryStatus} />
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <RowActions
                        product={product}
                        onAdjust={() => setAdjusting(product)}
                        onToggleActive={() => toggleActive(product)}
                        onDelete={() => setDeleting(product)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Mobile cards */}
          <ul className="space-y-3 md:hidden">
            {list.map((product) => (
              <li key={product._id}>
                <Card className={`p-4 ${product.isActive ? '' : 'opacity-60'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link to={`/products/${product._id}`} className="font-semibold text-ink-900">
                        {product.name}
                      </Link>
                      <p className="text-sm text-ink-500">{product.sku}</p>
                    </div>
                    <p className="shrink-0 font-semibold tabular">{formatPeso(product.sellingPrice)}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    {product.category && <CategoryBadge name={product.category.name} color={product.category.color} />}
                    <StockBadge status={product.stockStatus} />
                    <ExpiryBadge status={product.expiryStatus} />
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-line/70 pt-2">
                    <p className="text-sm text-ink-700 tabular">
                      <span className="font-semibold">{product.stock}</span> {unitLabel(product.unit, product.stock)} left
                    </p>
                    <RowActions
                      product={product}
                      onAdjust={() => setAdjusting(product)}
                      onToggleActive={() => toggleActive(product)}
                      onDelete={() => setDeleting(product)}
                    />
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}

      <AdjustStockModal product={adjusting} onClose={() => setAdjusting(null)} onSaved={products.refresh} />

      <ConfirmDialog
        open={deleting !== null}
        title="Delete product?"
        message={
          <>
            <strong>{deleting?.name}</strong> will be permanently removed. Products that already appear in sales cannot be
            deleted; archive them instead.
          </>
        }
        confirmLabel="Delete product"
        loading={deletePending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
