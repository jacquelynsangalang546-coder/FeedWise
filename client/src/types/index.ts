// Shapes of the data returned by the FeedWise API.

export type CategoryColor = 'green' | 'amber' | 'blue' | 'rose' | 'violet' | 'teal' | 'slate';
export type StockStatus = 'ok' | 'low' | 'out';
export type ExpiryStatus = 'ok' | 'near-expiry' | 'expired' | null;
export type AnimalType = 'poultry' | 'dog' | 'cat' | 'livestock' | 'general';
export type Unit = 'sack' | 'kg' | 'pack' | 'bottle' | 'can' | 'piece' | 'box';
export type CustomerType = 'retail' | 'wholesale' | 'farm';
export type PaymentMethod = 'cash' | 'gcash' | 'card';
export type DiscountType = 'none' | 'percent' | 'fixed';
export type SaleStatus = 'completed' | 'voided';

export interface Category {
  _id: string;
  name: string;
  description: string;
  color: CategoryColor;
  createdAt: string;
  updatedAt: string;
  productCount?: number;
  lowStockCount?: number;
}

export interface Supplier {
  _id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  leadTimeDays: number;
  createdAt: string;
  updatedAt: string;
  productCount?: number;
  reorderNeeded?: number;
}

export interface Customer {
  _id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  customerType: CustomerType;
  createdAt: string;
  updatedAt: string;
  purchaseCount?: number;
  totalSpent?: number;
  averageSpent?: number;
  lastPurchaseAt?: string | null;
}

export interface Product {
  _id: string;
  name: string;
  sku: string;
  category: Pick<Category, '_id' | 'name' | 'color'> | null;
  supplier: (Pick<Supplier, '_id' | 'name'> & Partial<Supplier>) | null;
  animalType: AnimalType;
  unit: Unit;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  reorderLevel: number;
  expiryDate: string | null;
  description: string;
  isActive: boolean;
  stockStatus: StockStatus;
  marginPercent: number;
  expiryStatus: ExpiryStatus;
  createdAt: string;
  updatedAt: string;
  lifetimeSold?: number;
  lifetimeRevenue?: number;
}

export interface LowStockProduct {
  _id: string;
  name: string;
  sku: string;
  unit: Unit;
  category: Pick<Category, '_id' | 'name' | 'color'> | null;
  supplier: { _id: string; name: string; phone: string; leadTimeDays: number } | null;
  stock: number;
  reorderLevel: number;
  stockStatus: StockStatus;
  stockRatio: number;
  suggestedReorderQty: number;
  estimatedReorderCost: number;
}

export interface SaleItem {
  _id: string;
  product: string;
  productName: string;
  sku: string;
  unit: Unit;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface Sale {
  _id: string;
  saleNumber: string;
  customer: string | { _id: string; name: string; phone: string; customerType: CustomerType } | null;
  customerName: string;
  itemCount: number;
  subtotal: number;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
  total: number;
  vatAmount: number;
  grossProfit: number;
  paymentMethod: PaymentMethod;
  amountTendered: number;
  change: number;
  status: SaleStatus;
  notes: string;
  voidedAt: string | null;
  voidReason: string;
  createdAt: string;
  items?: SaleItem[];
}

export interface AvailabilityItem {
  productId: string;
  found: boolean;
  name?: string;
  requested: number;
  available: number;
  sufficient: boolean;
  shortage: number;
  remainingAfterSale?: number;
  willBeLowStock?: boolean;
  reason: string | null;
}

export interface SalePreview {
  customerName: string;
  itemCount: number;
  subtotal: number;
  discountAmount: number;
  total: number;
  vatAmount: number;
  lines: { productName: string; sku: string; unit: Unit; unitPrice: number; quantity: number; lineTotal: number }[];
  payment: { amountTendered: number; change: number } | null;
  paymentError: string | null;
  availability: { allAvailable: boolean; items: AvailabilityItem[] };
  canComplete: boolean;
}

export interface DailyPoint {
  date: string;
  revenue: number;
  profit: number;
  salesCount: number;
}

export interface TopProduct {
  rank: number;
  productId: string;
  productName: string;
  sku: string;
  unit: Unit;
  quantitySold: number;
  orders: number;
  revenue: number;
  profit: number;
  marginPercent: number;
  revenueShare: number;
  currentStock: number | null;
  stockStatus: StockStatus | null;
}

export interface Dashboard {
  today: { date: string; revenue: number; salesCount: number; itemsSold: number; changeVsYesterday: number | null };
  month: { revenue: number; grossProfit: number; salesCount: number; averageSale: number };
  inventory: {
    activeProducts: number;
    lowStock: number;
    outOfStock: number;
    healthy: number;
    nearExpiry: number;
    valueAtCost: number;
  };
  last7Days: DailyPoint[];
  topProducts: TopProduct[];
  recentSales: Sale[];
}

export interface SalesSummary {
  range: { from: string; to: string; days: number };
  salesCount: number;
  revenue: number;
  grossProfit: number;
  profitMargin: number;
  totalDiscounts: number;
  itemsSold: number;
  averageSale: number;
  averageDailyRevenue: number;
  highestSale: { _id: string; saleNumber: string; total: number; customerName: string } | null;
  lowestSale: { _id: string; saleNumber: string; total: number; customerName: string } | null;
  bestDay: DailyPoint | null;
  voidedCount: number;
  voidedAmount: number;
  paymentBreakdown: { method: PaymentMethod; count: number; amount: number; share: number }[];
  daily: DailyPoint[];
}

export interface CategorySales {
  totalRevenue: number;
  categories: { categoryId: string; name: string; color: CategoryColor; revenue: number; profit: number; units: number; share: number }[];
}

export interface InventoryReport {
  productCount: number;
  totalUnits: number;
  costValue: number;
  retailValue: number;
  potentialProfit: number;
  statusCounts: Record<StockStatus, number>;
  nearExpiryDays: number;
  categories: {
    categoryId: string;
    name: string;
    color: CategoryColor;
    productCount: number;
    units: number;
    costValue: number;
    retailValue: number;
    lowStockCount: number;
    valueShare: number;
  }[];
  expiryAlerts: { _id: string; name: string; sku: string; stock: number; expiryDate: string; expiryStatus: ExpiryStatus; daysLeft: number }[];
  lowStock: LowStockProduct[];
}

// Standard API envelopes
export interface ApiResponse<T> {
  data: T;
  message?: string;
  meta?: Record<string, number>;
}

export interface ApiErrorBody {
  message: string;
  errors?: Record<string, string>;
  details?: unknown;
}
