import { zodResolver } from '@hookform/resolvers/zod';
import { Clock, Mail, MapPin, Pencil, Phone, Plus, Trash2, Truck } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { supplierApi } from '../api';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { errorProps, Field, Input } from '../components/ui/Field';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { SearchInput } from '../components/ui/SearchInput';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States';
import { useToast } from '../context/ToastContext';
import { useApi } from '../hooks/useApi';
import { useDebounce } from '../hooks/useDebounce';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { supplierSchema, type SupplierFormValues } from '../schemas/supplierSchema';
import type { Supplier } from '../types';
import { applyServerErrors, getErrorMessage } from '../utils/errors';

const EMPTY: SupplierFormValues = { name: '', contactPerson: '', phone: '', email: '', address: '', leadTimeDays: 3 };
const FIELDS = ['name', 'contactPerson', 'phone', 'email', 'address', 'leadTimeDays'] as const;

function SupplierFormModal({ supplier, onClose, onSaved }: { supplier: Supplier | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: supplier
      ? {
          name: supplier.name,
          contactPerson: supplier.contactPerson,
          phone: supplier.phone,
          email: supplier.email,
          address: supplier.address,
          leadTimeDays: supplier.leadTimeDays,
        }
      : EMPTY,
  });

  const onSubmit = async (values: SupplierFormValues) => {
    try {
      const result = supplier ? await supplierApi.update(supplier._id, values) : await supplierApi.create(values);
      toast.success(supplier ? `${result.data.name} updated` : `${result.data.name} added`);
      onSaved();
      onClose();
    } catch (error) {
      if (!applyServerErrors(error, setError, FIELDS)) toast.error(getErrorMessage(error));
    }
  };

  return (
    <Modal open title={supplier ? 'Edit supplier' : 'New supplier'} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5 sm:grid-cols-2">
        <Field label="Company name" htmlFor="sup-name" error={errors.name?.message} required className="sm:col-span-2">
          <Input id="sup-name" {...register('name')} {...errorProps('sup-name', errors.name?.message)} />
        </Field>
        <Field label="Contact person" htmlFor="sup-contact" error={errors.contactPerson?.message} required>
          <Input id="sup-contact" {...register('contactPerson')} {...errorProps('sup-contact', errors.contactPerson?.message)} />
        </Field>
        <Field label="Mobile number" htmlFor="sup-phone" error={errors.phone?.message} required>
          <Input id="sup-phone" type="tel" inputMode="tel" placeholder="09171234567" {...register('phone')} {...errorProps('sup-phone', errors.phone?.message)} />
        </Field>
        <Field label="Email" htmlFor="sup-email" error={errors.email?.message}>
          <Input id="sup-email" type="email" {...register('email')} {...errorProps('sup-email', errors.email?.message)} />
        </Field>
        <Field label="Lead time (days)" htmlFor="sup-lead" error={errors.leadTimeDays?.message} required hint="Days from order to delivery">
          <Input id="sup-lead" type="number" inputMode="numeric" min={0} max={60} {...register('leadTimeDays', { valueAsNumber: true })} {...errorProps('sup-lead', errors.leadTimeDays?.message)} />
        </Field>
        <Field label="Address" htmlFor="sup-address" error={errors.address?.message} className="sm:col-span-2">
          <Input id="sup-address" {...register('address')} />
        </Field>
        <div className="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {supplier ? 'Save changes' : 'Add supplier'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function SuppliersPage() {
  useDocumentTitle('Suppliers');
  const toast = useToast();
  const [searchText, setSearchText] = useState('');
  const search = useDebounce(searchText);
  const suppliers = useApi(() => supplierApi.list({ search }), [search]);
  const [editing, setEditing] = useState<Supplier | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Supplier | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletePending(true);
    try {
      await supplierApi.remove(deleting._id);
      toast.success(`${deleting.name} deleted`);
      suppliers.refresh();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setDeletePending(false);
      setDeleting(null);
    }
  };

  const list = suppliers.data ?? [];

  return (
    <>
      <PageHeader
        title="Suppliers"
        description="Who delivers your feeds and supplies, and how long they take."
        actions={
          <Button onClick={() => setEditing(null)} icon={<Plus className="size-4" />}>
            New supplier
          </Button>
        }
      />
      <SearchInput
        className="mb-5 max-w-md"
        placeholder="Search by company or contact"
        value={searchText}
        onChange={(event) => setSearchText(event.target.value)}
        aria-label="Search suppliers"
      />

      {suppliers.loading ? (
        <LoadingState rows={4} label="Loading suppliers" />
      ) : suppliers.error ? (
        <ErrorState message={suppliers.error} onRetry={suppliers.refetch} />
      ) : list.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Truck className="size-6" />}
            title={search ? 'No supplier matches your search' : 'No suppliers yet'}
            message={search ? 'Try another name.' : 'Add the companies you buy stock from.'}
            action={!search && <Button onClick={() => setEditing(null)}>New supplier</Button>}
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((supplier) => (
            <Card key={supplier._id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-semibold text-pasture-900">{supplier.name}</h2>
                  <p className="text-sm text-ink-500">{supplier.contactPerson}</p>
                </div>
                <div className="-mt-1 -mr-2 flex shrink-0">
                  <button type="button" onClick={() => setEditing(supplier)} className="rounded-lg p-2 text-ink-500 hover:bg-pasture-50 hover:text-ink-900" aria-label={`Edit ${supplier.name}`}>
                    <Pencil className="size-4" />
                  </button>
                  <button type="button" onClick={() => setDeleting(supplier)} className="rounded-lg p-2 text-ink-500 hover:bg-barn-50 hover:text-barn-600" aria-label={`Delete ${supplier.name}`}>
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-ink-700">
                <li className="flex items-center gap-2.5">
                  <Phone className="size-4 text-ink-400" aria-hidden />
                  <a href={`tel:${supplier.phone}`} className="hover:text-leaf-700">{supplier.phone}</a>
                </li>
                {supplier.email && (
                  <li className="flex min-w-0 items-center gap-2.5">
                    <Mail className="size-4 shrink-0 text-ink-400" aria-hidden />
                    <a href={`mailto:${supplier.email}`} className="truncate hover:text-leaf-700">{supplier.email}</a>
                  </li>
                )}
                {supplier.address && (
                  <li className="flex items-center gap-2.5">
                    <MapPin className="size-4 text-ink-400" aria-hidden />
                    {supplier.address}
                  </li>
                )}
                <li className="flex items-center gap-2.5">
                  <Clock className="size-4 text-ink-400" aria-hidden />
                  Delivers in {supplier.leadTimeDays} day{supplier.leadTimeDays === 1 ? '' : 's'}
                </li>
              </ul>
              <div className="mt-4 flex items-center justify-between border-t border-line/70 pt-3 text-sm">
                <Link to={`/products?supplier=${supplier._id}`} className="font-semibold text-leaf-700 hover:underline">
                  {supplier.productCount ?? 0} product{supplier.productCount === 1 ? '' : 's'} supplied
                </Link>
                {(supplier.reorderNeeded ?? 0) > 0 && (
                  <span className="font-semibold text-grain-700">{supplier.reorderNeeded} to reorder</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {editing !== undefined && <SupplierFormModal supplier={editing} onClose={() => setEditing(undefined)} onSaved={suppliers.refresh} />}
      <ConfirmDialog
        open={deleting !== null}
        title="Delete supplier?"
        message={
          <>
            Delete <strong>{deleting?.name}</strong>? Suppliers linked to products cannot be deleted until those products are reassigned.
          </>
        }
        confirmLabel="Delete supplier"
        loading={deletePending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
