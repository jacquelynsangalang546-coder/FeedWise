import type {
  ApiResponse,
  AvailabilityItem,
  Category,
  CategorySales,
  Customer,
  Dashboard,
  InventoryReport,
  LowStockProduct,
  Product,
  Sale,
  SalePreview,
  SalesSummary,
  Supplier,
  TopProduct,
} from '../types';
import type { CategoryFormValues } from '../schemas/categorySchema';
import type { CustomerFormValues } from '../schemas/customerSchema';
import type { ProductFormValues } from '../schemas/productSchema';
import type { SupplierFormValues } from '../schemas/supplierSchema';
import api from './client';

// Every function returns the "data" part of the JSON envelope { data, message }.
type Params = Record<string, string | number | undefined>;

const clean = (params: Params = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined && value !== ''));

export const categoryApi = {
  list: () => api.get<ApiResponse<Category[]>>('/categories').then((res) => res.data.data),
  create: (values: CategoryFormValues) => api.post<ApiResponse<Category>>('/categories', values).then((res) => res.data),
  update: (id: string, values: CategoryFormValues) =>
    api.put<ApiResponse<Category>>(`/categories/${id}`, values).then((res) => res.data),
  remove: (id: string) => api.delete<ApiResponse<{ _id: string }>>(`/categories/${id}`).then((res) => res.data),
};

export const supplierApi = {
  list: (params?: Params) =>
    api.get<ApiResponse<Supplier[]>>('/suppliers', { params: clean(params) }).then((res) => res.data.data),
  create: (values: SupplierFormValues) => api.post<ApiResponse<Supplier>>('/suppliers', values).then((res) => res.data),
  update: (id: string, values: SupplierFormValues) =>
    api.put<ApiResponse<Supplier>>(`/suppliers/${id}`, values).then((res) => res.data),
  remove: (id: string) => api.delete<ApiResponse<{ _id: string }>>(`/suppliers/${id}`).then((res) => res.data),
};

export const customerApi = {
  list: (params?: Params) =>
    api.get<ApiResponse<Customer[]>>('/customers', { params: clean(params) }).then((res) => res.data.data),
  create: (values: CustomerFormValues) => api.post<ApiResponse<Customer>>('/customers', values).then((res) => res.data),
  update: (id: string, values: CustomerFormValues) =>
    api.put<ApiResponse<Customer>>(`/customers/${id}`, values).then((res) => res.data),
  remove: (id: string) => api.delete<ApiResponse<{ _id: string }>>(`/customers/${id}`).then((res) => res.data),
};

// Product form values are converted: empty supplier / expiry become null
function toProductPayload(values: ProductFormValues) {
  return {
    ...values,
    supplier: values.supplier || null,
    expiryDate: values.expiryDate || null,
  };
}

export const productApi = {
  list: (params?: Params) =>
    api.get<ApiResponse<Product[]>>('/products', { params: clean(params) }).then((res) => res.data.data),
  get: (id: string) => api.get<ApiResponse<Product>>(`/products/${id}`).then((res) => res.data.data),
  create: (values: ProductFormValues) =>
    api.post<ApiResponse<Product>>('/products', toProductPayload(values)).then((res) => res.data),
  // Stock is NOT sent on edit: it only changes through sales and stock adjustments,
  // so an edit form opened earlier can never overwrite a newer stock level.
  update: (id: string, values: ProductFormValues) => {
    const { stock: _stock, ...payload } = toProductPayload(values);
    return api.put<ApiResponse<Product>>(`/products/${id}`, payload).then((res) => res.data);
  },
  setActive: (id: string, isActive: boolean) =>
    api.put<ApiResponse<Product>>(`/products/${id}`, { isActive }).then((res) => res.data),
  remove: (id: string) => api.delete<ApiResponse<{ _id: string }>>(`/products/${id}`).then((res) => res.data),
  lowStock: () => api.get<ApiResponse<LowStockProduct[]>>('/products/low-stock').then((res) => res.data.data),
  adjustStock: (id: string, adjustment: number, reason: string) =>
    api.patch<ApiResponse<Product>>(`/products/${id}/stock`, { adjustment, reason }).then((res) => res.data),
  checkAvailability: (items: { productId: string; quantity: number }[]) =>
    api
      .post<ApiResponse<{ allAvailable: boolean; items: AvailabilityItem[] }>>('/products/check-availability', { items })
      .then((res) => res.data.data),
};

export interface SalePayload {
  clientRequestId?: string;
  customer: string | null;
  items: { productId: string; quantity: number }[];
  discountType: 'none' | 'percent' | 'fixed';
  discountValue: number;
  paymentMethod: 'cash' | 'gcash' | 'card';
  amountTendered?: number;
  notes?: string;
}

export const saleApi = {
  list: (params?: Params) =>
    api
      .get<ApiResponse<Sale[]>>('/sales', { params: clean(params) })
      .then((res) => ({ sales: res.data.data, meta: res.data.meta ?? {} })),
  get: (id: string) => api.get<ApiResponse<Sale>>(`/sales/${id}`).then((res) => res.data.data),
  preview: (payload: SalePayload) =>
    api.post<ApiResponse<SalePreview>>('/sales/preview', payload).then((res) => res.data.data),
  create: (payload: SalePayload) => api.post<ApiResponse<Sale>>('/sales', payload).then((res) => res.data),
  void: (id: string, reason: string) =>
    api.patch<ApiResponse<Sale>>(`/sales/${id}/void`, { reason }).then((res) => res.data),
};

export const reportApi = {
  dashboard: () => api.get<ApiResponse<Dashboard>>('/reports/dashboard').then((res) => res.data.data),
  salesSummary: (params?: Params) =>
    api.get<ApiResponse<SalesSummary>>('/reports/sales-summary', { params: clean(params) }).then((res) => res.data.data),
  topProducts: (params?: Params) =>
    api
      .get<ApiResponse<{ totalRevenue: number; products: TopProduct[] }>>('/reports/top-products', {
        params: clean(params),
      })
      .then((res) => res.data.data),
  categorySales: (params?: Params) =>
    api.get<ApiResponse<CategorySales>>('/reports/category-sales', { params: clean(params) }).then((res) => res.data.data),
  inventory: () => api.get<ApiResponse<InventoryReport>>('/reports/inventory').then((res) => res.data.data),
};
