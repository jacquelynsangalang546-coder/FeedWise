
import { useEffect, useRef } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { categoryApi, supplierApi } from '../../api';
import { useApi } from '../../hooks/useApi';
import { ANIMAL_TYPES, productSchema, UNITS, type ProductFormValues } from '../../schemas/productSchema';
import { applyServerErrors } from '../../utils/errors';
import { capitalize, formatPeso } from '../../utils/format';
import { Button, ButtonLink } from '../ui/Button';
import { Card } from '../ui/Card';
import { errorProps, Field, Input, Select, Textarea } from '../ui/Field';
import { ErrorState } from '../ui/States';

const FIELD_NAMES = [
  'name',
  'sku',
  'category',
  'supplier',
  'animalType',
  'unit',
  'costPrice',
  'sellingPrice',
  'stock',
  'reorderLevel',
  'expiryDate',
  'description',
] as const;

export const EMPTY_PRODUCT: ProductFormValues = {
  name: '',
  sku: '',
  category: '',
  supplier: '',
  animalType: 'poultry',
  unit: 'sack',
  costPrice: Number.NaN,
  sellingPrice: Number.NaN,
  stock: 0,
  reorderLevel: 5,
  expiryDate: '',
  description: '',
  isActive: true,
};

interface ProductFormProps {
  mode: 'create' | 'edit';
  defaultValues: ProductFormValues;
  onSubmit: (values: ProductFormValues) => Promise<void>;
  onError: (error: unknown) => void;
}

export function ProductForm({ mode, defaultValues, onSubmit, onError }: ProductFormProps) {
  const categories = useApi(() => categoryApi.list(), []);
  const suppliers = useApi(() => supplierApi.list(), []);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues,
  });

  // Restore saved form values once dropdown options are available.
  // Run only once so user edits are not overwritten.
  const initialized = useRef(false);

  useEffect(() => {
    if (
      mode === 'edit' &&
      !initialized.current &&
      categories.data &&
      suppliers.data
    ) {
      reset(defaultValues);
      initialized.current = true;
    }
  }, [mode, categories.data, suppliers.data, defaultValues, reset]);

  // Derived values for the pricing preview
  const cost = watch('costPrice');
  const price = watch('sellingPrice');
  const pricesValid = Number.isFinite(cost) && Number.isFinite(price) && price > 0;
  const profitPerUnit = pricesValid ? price - cost : 0;
  const margin = pricesValid ? (profitPerUnit / price) * 100 : 0;

  const submit = async (values: ProductFormValues) => {
    try {
      await onSubmit(values);
    } catch (error) {
      // Server-side field errors (e.g. duplicate SKU) go under the matching input
      if (!applyServerErrors(error, setError, FIELD_NAMES)) onError(error);
    }
  };

  if (categories.error) {
    return <ErrorState message={categories.error} onRetry={categories.refetch} />;
  }

  return (
    <form onSubmit={handleSubmit(submit)} noValidate className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card className="p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-pasture-900">Product details</h2>

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <Field
              label="Product name"
              htmlFor="name"
              error={errors.name?.message}
              required
              className="sm:col-span-2"
            >
              <Input
                id="name"
                placeholder="e.g. Layer Mash Complete 50kg"
                {...register('name')}
                {...errorProps('name', errors.name?.message)}
              />
            </Field>

            <Field
              label="SKU"
              htmlFor="sku"
              error={errors.sku?.message}
              required
              hint="Letters, numbers and dashes"
            >
              <Input
                id="sku"
                placeholder="PF-LYR-50"
                className="uppercase"
                {...register('sku')}
                {...errorProps('sku', errors.sku?.message)}
              />
            </Field>

            <Field
              label="Category"
              htmlFor="category"
              error={errors.category?.message}
              required
            >
              <Select
                id="category"
                disabled={categories.loading}
                {...register('category')}
                {...errorProps('category', errors.category?.message)}
              >
                <option value="">
                  {categories.loading ? 'Loading categories…' : 'Choose a category'}
                </option>
                {categories.data?.map((category) => (
                  <option key={category._id} value={category._id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Supplier"
              htmlFor="supplier"
              error={errors.supplier?.message}
            >
              <Select
                id="supplier"
                disabled={suppliers.loading}
                {...register('supplier')}
              >
                <option value="">No supplier</option>
                {suppliers.data?.map((supplier) => (
                  <option key={supplier._id} value={supplier._id}>
                    {supplier.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="For"
              htmlFor="animalType"
              error={errors.animalType?.message}
            >
              <Select id="animalType" {...register('animalType')}>
                {ANIMAL_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {capitalize(type)}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Description"
              htmlFor="description"
              error={errors.description?.message}
              className="sm:col-span-2"
            >
              <Textarea
                id="description"
                rows={3}
                placeholder="Optional notes for staff"
                {...register('description')}
              />
            </Field>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-pasture-900">Stock</h2>

          <div className="mt-5 grid gap-5 sm:grid-cols-3">
            <Field
              label="Sold per"
              htmlFor="unit"
              error={errors.unit?.message}
            >
              <Select id="unit" {...register('unit')}>
                {UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {capitalize(unit)}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label={mode === 'create' ? 'Opening stock' : 'Current stock'}
              htmlFor="stock"
              error={errors.stock?.message}
              required
              hint={
                mode === 'edit'
                  ? 'Change stock with “Adjust stock” on the product page'
                  : undefined
              }
            >
              <Input
                id="stock"
                type="number"
                inputMode="numeric"
                min={0}
                readOnly={mode === 'edit'}
                {...register('stock', { valueAsNumber: true })}
                {...errorProps('stock', errors.stock?.message)}
              />
            </Field>

            <Field
              label="Reorder level"
              htmlFor="reorderLevel"
              error={errors.reorderLevel?.message}
              required
              hint="Warn me at this many units"
            >
              <Input
                id="reorderLevel"
                type="number"
                inputMode="numeric"
                min={0}
                {...register('reorderLevel', { valueAsNumber: true })}
                {...errorProps('reorderLevel', errors.reorderLevel?.message)}
              />
            </Field>

            <Field
              label="Expiry date"
              htmlFor="expiryDate"
              error={errors.expiryDate?.message}
              hint="Leave blank if it does not expire"
              className="sm:col-span-3 sm:max-w-xs"
            >
              <Input
                id="expiryDate"
                type="date"
                {...register('expiryDate')}
              />
            </Field>
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-pasture-900">Pricing</h2>

          <div className="mt-5 space-y-5">
            <Field
              label="Cost price (₱)"
              htmlFor="costPrice"
              error={errors.costPrice?.message}
              required
            >
              <Input
                id="costPrice"
                type="number"
                inputMode="decimal"
                step="0.01"
                min={0}
                placeholder="0.00"
                {...register('costPrice', { valueAsNumber: true })}
                {...errorProps('costPrice', errors.costPrice?.message)}
              />
            </Field>

            <Field
              label="Selling price (₱)"
              htmlFor="sellingPrice"
              error={errors.sellingPrice?.message}
              required
              hint="VAT-inclusive shelf price"
            >
              <Input
                id="sellingPrice"
                type="number"
                inputMode="decimal"
                step="0.01"
                min={0}
                placeholder="0.00"
                {...register('sellingPrice', { valueAsNumber: true })}
                {...errorProps('sellingPrice', errors.sellingPrice?.message)}
              />
            </Field>

            <dl className="rounded-xl bg-canvas px-4 py-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-500">Profit per unit</dt>
                <dd className={`font-semibold tabular ${profitPerUnit < 0 ? 'text-barn-600' : ''}`}>
                  {pricesValid ? formatPeso(profitPerUnit) : '—'}
                </dd>
              </div>

              <div className="mt-1 flex justify-between">
                <dt className="text-ink-500">Margin</dt>
                <dd
                  className={`font-semibold tabular ${
                    margin < 0 ? 'text-barn-600' : 'text-leaf-700'
                  }`}
                >
                  {pricesValid ? `${margin.toFixed(1)}%` : '—'}
                </dd>
              </div>
            </dl>
          </div>
        </Card>

        <div className="flex flex-col gap-2">
          <Button
            type="submit"
            size="lg"
            loading={isSubmitting}
            disabled={mode === 'edit' && !isDirty}
          >
            {mode === 'create' ? 'Save product' : 'Save changes'}
          </Button>

          <ButtonLink to="/products" variant="secondary" size="lg">
            Cancel
          </ButtonLink>
        </div>
      </div>
    </form>
  );
}
