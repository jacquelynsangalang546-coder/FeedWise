import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { categoryApi } from '../api';
import { categoryDotClass } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { errorProps, Field, Input, Textarea } from '../components/ui/Field';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States';
import { useToast } from '../context/ToastContext';
import { useApi } from '../hooks/useApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { CATEGORY_COLORS, categorySchema, type CategoryFormValues } from '../schemas/categorySchema';
import type { Category } from '../types';
import { applyServerErrors, getErrorMessage } from '../utils/errors';
import { capitalize } from '../utils/format';

const EMPTY: CategoryFormValues = { name: '', description: '', color: 'green' };

function CategoryFormModal({
  category,
  onClose,
  onSaved,
}: {
  category: Category | null; // null = create
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: category ? { name: category.name, description: category.description, color: category.color } : EMPTY,
  });
  const selectedColor = watch('color');

  const onSubmit = async (values: CategoryFormValues) => {
    try {
      const result = category ? await categoryApi.update(category._id, values) : await categoryApi.create(values);
      toast.success(category ? `${result.data.name} updated` : `${result.data.name} created`);
      onSaved();
      onClose();
    } catch (error) {
      if (!applyServerErrors(error, setError, ['name', 'description', 'color'])) toast.error(getErrorMessage(error));
    }
  };

  return (
    <Modal open title={category ? 'Edit category' : 'New category'} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <Field label="Name" htmlFor="cat-name" error={errors.name?.message} required>
          <Input id="cat-name" placeholder="e.g. Poultry Feeds" {...register('name')} {...errorProps('cat-name', errors.name?.message)} />
        </Field>
        <Field label="Description" htmlFor="cat-description" error={errors.description?.message}>
          <Textarea id="cat-description" rows={3} {...register('description')} />
        </Field>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-ink-700">Badge color</legend>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_COLORS.map((color) => (
              <label
                key={color}
                className={`flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm ring-1 ring-inset ${
                  selectedColor === color ? 'bg-pasture-50 font-semibold ring-leaf-600' : 'ring-line hover:bg-canvas'
                }`}
              >
                <input type="radio" value={color} className="sr-only" {...register('color')} />
                <span className={`size-3 rounded-full ${categoryDotClass[color]}`} aria-hidden />
                {capitalize(color)}
              </label>
            ))}
          </div>
          {errors.color && <p className="mt-1.5 text-sm text-barn-600">{errors.color.message}</p>}
        </fieldset>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {category ? 'Save changes' : 'Create category'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function CategoriesPage() {
  useDocumentTitle('Categories');
  const toast = useToast();
  const categories = useApi(() => categoryApi.list(), []);
  const [editing, setEditing] = useState<Category | null | undefined>(undefined); // undefined = closed
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletePending(true);
    try {
      await categoryApi.remove(deleting._id);
      toast.success(`${deleting.name} deleted`);
      categories.refresh();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setDeletePending(false);
      setDeleting(null);
    }
  };

  const list = categories.data ?? [];
  const totalProducts = list.reduce((sum, category) => sum + (category.productCount ?? 0), 0);

  return (
    <>
      <PageHeader
        title="Categories"
        description={list.length ? `${list.length} categories covering ${totalProducts} active products.` : 'Group products so reports and filters make sense.'}
        actions={
          <Button onClick={() => setEditing(null)} icon={<Plus className="size-4" />}>
            New category
          </Button>
        }
      />

      {categories.loading ? (
        <LoadingState rows={4} label="Loading categories" />
      ) : categories.error ? (
        <ErrorState message={categories.error} onRetry={categories.refetch} />
      ) : list.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Tags className="size-6" />}
            title="No categories yet"
            message="Create a category such as Poultry Feeds before adding products."
            action={<Button onClick={() => setEditing(null)}>New category</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((category) => (
            <Card key={category._id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className={`size-3 shrink-0 rounded-full ${categoryDotClass[category.color]}`} aria-hidden />
                  <h2 className="truncate text-lg font-semibold text-pasture-900">{category.name}</h2>
                </div>
                <div className="-mt-1 -mr-2 flex">
                  <button
                    type="button"
                    onClick={() => setEditing(category)}
                    className="rounded-lg p-2 text-ink-500 hover:bg-pasture-50 hover:text-ink-900"
                    aria-label={`Edit ${category.name}`}
                  >
                    <Pencil className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(category)}
                    className="rounded-lg p-2 text-ink-500 hover:bg-barn-50 hover:text-barn-600"
                    aria-label={`Delete ${category.name}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
              <p className="mt-2 flex-1 text-sm text-ink-500">{category.description || 'No description'}</p>
              <div className="mt-4 flex items-center justify-between border-t border-line/70 pt-3 text-sm">
                <Link to={`/products?category=${category._id}`} className="font-semibold text-leaf-700 hover:underline">
                  {category.productCount ?? 0} product{category.productCount === 1 ? '' : 's'}
                </Link>
                {(category.lowStockCount ?? 0) > 0 && (
                  <span className="font-semibold text-grain-700">{category.lowStockCount} need reordering</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {editing !== undefined && (
        <CategoryFormModal category={editing} onClose={() => setEditing(undefined)} onSaved={categories.refresh} />
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="Delete category?"
        message={
          <>
            Delete <strong>{deleting?.name}</strong>? Categories that still contain products cannot be deleted.
          </>
        }
        confirmLabel="Delete category"
        loading={deletePending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
