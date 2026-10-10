import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { productApi } from '../../api';
import { useToast } from '../../context/ToastContext';
import { stockAdjustmentSchema, type StockAdjustmentValues } from '../../schemas/stockSchema';
import type { Product } from '../../types';
import { applyServerErrors, getErrorMessage } from '../../utils/errors';
import { unitLabel } from '../../utils/format';
import { Button } from '../ui/Button';
import { errorProps, Field, Input, Select } from '../ui/Field';
import { Modal } from '../ui/Modal';

interface AdjustStockModalProps {
  product: Pick<Product, '_id' | 'name' | 'stock' | 'unit' | 'reorderLevel'> | null;
  onClose: () => void;
  onSaved: () => void;
}

const DEFAULTS: StockAdjustmentValues = { direction: 'add', quantity: 1, reason: '' };

export function AdjustStockModal({ product, onClose, onSaved }: AdjustStockModalProps) {
  const toast = useToast();
  const {
    register,
    handleSubmit,
    watch,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<StockAdjustmentValues>({ resolver: zodResolver(stockAdjustmentSchema), defaultValues: DEFAULTS });

  useEffect(() => {
    if (product) reset(DEFAULTS);
  }, [product, reset]);

  if (!product) return null;

  // Derived preview of the resulting stock level
  const direction = watch('direction');
  const quantity = watch('quantity');
  const change = Number.isFinite(quantity) ? (direction === 'add' ? quantity : -quantity) : 0;
  const resulting = product.stock + change;

  const onSubmit = async (values: StockAdjustmentValues) => {
    if (values.direction === 'remove' && values.quantity > product.stock) {
      setError('quantity', { message: `Only ${product.stock} in stock. Stock cannot go below zero.` });
      return;
    }
    try {
      const adjustment = values.direction === 'add' ? values.quantity : -values.quantity;
      const result = await productApi.adjustStock(product._id, adjustment, values.reason);
      toast.success(result.message ?? 'Stock updated');
      onSaved();
      onClose();
    } catch (error) {
      if (!applyServerErrors(error, setError, ['reason'])) {
        setError('quantity', { message: getErrorMessage(error) });
      }
    }
  };

  return (
    <Modal open title="Adjust stock" description={product.name} onClose={onClose} size="sm">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Action" htmlFor="adj-direction">
            <Select id="adj-direction" {...register('direction')}>
              <option value="add">Add stock</option>
              <option value="remove">Remove stock</option>
            </Select>
          </Field>
          <Field label="Quantity" htmlFor="adj-quantity" error={errors.quantity?.message} required>
            <Input
              id="adj-quantity"
              type="number"
              inputMode="numeric"
              min={1}
              {...register('quantity', { valueAsNumber: true })}
              {...errorProps('adj-quantity', errors.quantity?.message)}
            />
          </Field>
        </div>
        <Field label="Reason" htmlFor="adj-reason" error={errors.reason?.message} required>
          <Input
            id="adj-reason"
            placeholder="e.g. Delivery from supplier, damaged sack"
            {...register('reason')}
            {...errorProps('adj-reason', errors.reason?.message)}
          />
        </Field>
        <div className="rounded-xl bg-canvas px-4 py-3 text-sm">
          <div className="flex justify-between">
            <span className="text-ink-500">Current</span>
            <span className="tabular">
              {product.stock} {unitLabel(product.unit, product.stock)}
            </span>
          </div>
          <div className="mt-1 flex justify-between font-semibold">
            <span>After adjustment</span>
            <span className={`tabular ${resulting < 0 ? 'text-barn-600' : resulting <= product.reorderLevel ? 'text-grain-700' : 'text-leaf-700'}`}>
              {resulting} {unitLabel(product.unit, resulting)}
            </span>
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting} disabled={resulting < 0}>
            Save adjustment
          </Button>
        </div>
      </form>
    </Modal>
  );
}
