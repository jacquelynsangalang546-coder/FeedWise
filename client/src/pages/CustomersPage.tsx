import { zodResolver } from '@hookform/resolvers/zod';
import { Contact, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { customerApi } from '../api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { errorProps, Field, Input, Select } from '../components/ui/Field';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { SearchInput } from '../components/ui/SearchInput';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States';
import { useToast } from '../context/ToastContext';
import { useApi } from '../hooks/useApi';
import { useDebounce } from '../hooks/useDebounce';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { CUSTOMER_TYPES, customerSchema, type CustomerFormValues } from '../schemas/customerSchema';
import type { Customer, CustomerType } from '../types';
import { applyServerErrors, getErrorMessage } from '../utils/errors';
import { capitalize, formatDate, formatPeso } from '../utils/format';

const EMPTY: CustomerFormValues = { name: '', phone: '', email: '', address: '', customerType: 'retail' };
const FIELDS = ['name', 'phone', 'email', 'address', 'customerType'] as const;
const typeTone: Record<CustomerType, 'blue' | 'amber' | 'green'> = { retail: 'blue', wholesale: 'amber', farm: 'green' };

function CustomerFormModal({ customer, onClose, onSaved }: { customer: Customer | null; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: customer
      ? { name: customer.name, phone: customer.phone, email: customer.email, address: customer.address, customerType: customer.customerType }
      : EMPTY,
  });

  const onSubmit = async (values: CustomerFormValues) => {
    try {
      const result = customer ? await customerApi.update(customer._id, values) : await customerApi.create(values);
      toast.success(customer ? `${result.data.name} updated` : `${result.data.name} added`);
      onSaved();
      onClose();
    } catch (error) {
      if (!applyServerErrors(error, setError, FIELDS)) toast.error(getErrorMessage(error));
    }
  };

  return (
    <Modal open title={customer ? 'Edit customer' : 'New customer'} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name or business" htmlFor="cus-name" error={errors.name?.message} required className="sm:col-span-2">
          <Input id="cus-name" {...register('name')} {...errorProps('cus-name', errors.name?.message)} />
        </Field>
        <Field label="Mobile number" htmlFor="cus-phone" error={errors.phone?.message} required>
          <Input id="cus-phone" type="tel" inputMode="tel" placeholder="09171234567" {...register('phone')} {...errorProps('cus-phone', errors.phone?.message)} />
        </Field>
        <Field label="Customer type" htmlFor="cus-type" error={errors.customerType?.message}>
          <Select id="cus-type" {...register('customerType')}>
            {CUSTOMER_TYPES.map((type) => (
              <option key={type} value={type}>
                {capitalize(type)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Email" htmlFor="cus-email" error={errors.email?.message} className="sm:col-span-2">
          <Input id="cus-email" type="email" {...register('email')} {...errorProps('cus-email', errors.email?.message)} />
        </Field>
        <Field label="Address" htmlFor="cus-address" error={errors.address?.message} className="sm:col-span-2">
          <Input id="cus-address" {...register('address')} />
        </Field>
        <div className="flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {customer ? 'Save changes' : 'Add customer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default function CustomersPage() {
  useDocumentTitle('Customers');
  const toast = useToast();
  const [searchText, setSearchText] = useState('');
  const [type, setType] = useState('');
  const search = useDebounce(searchText);
  const customers = useApi(() => customerApi.list({ search, type }), [search, type]);
  const [editing, setEditing] = useState<Customer | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Customer | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletePending(true);
    try {
      await customerApi.remove(deleting._id);
      toast.success(`${deleting.name} deleted`);
      customers.refresh();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setDeletePending(false);
      setDeleting(null);
    }
  };

  const list = customers.data ?? [];
  // Derived: customers sorted by lifetime spend to highlight the best ones
  const topSpenderId = list.reduce<Customer | null>(
    (best, customer) => ((customer.totalSpent ?? 0) > (best?.totalSpent ?? 0) ? customer : best),
    null
  )?._id;

  const actions = (customer: Customer) => (
    <div className="flex">
      <button type="button" onClick={() => setEditing(customer)} className="rounded-lg p-2 text-ink-500 hover:bg-pasture-50 hover:text-ink-900" aria-label={`Edit ${customer.name}`}>
        <Pencil className="size-4" />
      </button>
      <button type="button" onClick={() => setDeleting(customer)} className="rounded-lg p-2 text-ink-500 hover:bg-barn-50 hover:text-barn-600" aria-label={`Delete ${customer.name}`}>
        <Trash2 className="size-4" />
      </button>
    </div>
  );

  return (
    <>
      <PageHeader
        title="Customers"
        description="Regulars, farms and wholesale buyers, with what they have spent."
        actions={
          <Button onClick={() => setEditing(null)} icon={<Plus className="size-4" />}>
            New customer
          </Button>
        }
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-[minmax(0,28rem)_12rem]">
        <SearchInput placeholder="Search name, phone or email" value={searchText} onChange={(e) => setSearchText(e.target.value)} aria-label="Search customers" />
        <Select value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by customer type">
          <option value="">All types</option>
          {CUSTOMER_TYPES.map((item) => (
            <option key={item} value={item}>
              {capitalize(item)}
            </option>
          ))}
        </Select>
      </div>

      {customers.loading ? (
        <LoadingState rows={5} label="Loading customers" />
      ) : customers.error ? (
        <ErrorState message={customers.error} onRetry={customers.refetch} />
      ) : list.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Contact className="size-6" />}
            title={search || type ? 'No customer matches' : 'No customers yet'}
            message={search || type ? 'Try another search or type.' : 'Add regular buyers to track their purchases.'}
            action={!search && !type && <Button onClick={() => setEditing(null)}>New customer</Button>}
          />
        </Card>
      ) : (
        <>
          <Card className="hidden overflow-hidden md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-canvas/60 text-ink-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Customer</th>
                  <th className="px-3 py-3 font-semibold">Type</th>
                  <th className="px-3 py-3 text-right font-semibold">Purchases</th>
                  <th className="px-3 py-3 text-right font-semibold">Total spent</th>
                  <th className="px-3 py-3 font-semibold">Last purchase</th>
                  <th className="px-5 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/70">
                {list.map((customer) => (
                  <tr key={customer._id} className="hover:bg-pasture-50/50">
                    <td className="px-5 py-3">
                      <p className="font-semibold">
                        {customer.name}
                        {customer._id === topSpenderId && <span className="ml-2 align-middle"><Badge tone="amber">Top buyer</Badge></span>}
                      </p>
                      <p className="text-ink-500">{customer.phone}</p>
                    </td>
                    <td className="px-3 py-3">
                      <Badge tone={typeTone[customer.customerType]}>{capitalize(customer.customerType)}</Badge>
                    </td>
                    <td className="px-3 py-3 text-right tabular">
                      {customer.purchaseCount ? (
                        <Link to={`/sales?customer=${customer._id}`} className="font-semibold text-leaf-700 hover:underline">
                          {customer.purchaseCount}
                        </Link>
                      ) : (
                        0
                      )}
                    </td>
                    <td className="px-3 py-3 text-right font-semibold tabular">{formatPeso(customer.totalSpent ?? 0)}</td>
                    <td className="px-3 py-3 text-ink-700">{customer.lastPurchaseAt ? formatDate(customer.lastPurchaseAt) : 'Never'}</td>
                    <td className="px-5 py-2 text-right">
                      <div className="flex justify-end">{actions(customer)}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <ul className="space-y-3 md:hidden">
            {list.map((customer) => (
              <li key={customer._id}>
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{customer.name}</p>
                      <p className="text-sm text-ink-500">{customer.phone}</p>
                    </div>
                    <Badge tone={typeTone[customer.customerType]}>{capitalize(customer.customerType)}</Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-line/70 pt-2">
                    <p className="text-sm text-ink-700 tabular">
                      <span className="font-semibold">{formatPeso(customer.totalSpent ?? 0)}</span> over {customer.purchaseCount ?? 0} purchases
                    </p>
                    {actions(customer)}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}

      {editing !== undefined && <CustomerFormModal customer={editing} onClose={() => setEditing(undefined)} onSaved={customers.refresh} />}
      <ConfirmDialog
        open={deleting !== null}
        title="Delete customer?"
        message={
          <>
            Delete <strong>{deleting?.name}</strong>? Customers with sales on record cannot be deleted because sales history must be kept.
          </>
        }
        confirmLabel="Delete customer"
        loading={deletePending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
