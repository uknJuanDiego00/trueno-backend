// =====================================================================
// TRUENO 219 - TypeScript Types and Data Contracts
// =====================================================================

export type UserRole = 'admin' | 'empleado';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StoreSettings {
  id: string;
  store_name: string;
  low_stock_threshold: number;
  currency: string;
  tax_rate: number;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  buy_price: number;
  sell_price: number;
  stock: number;
  warehouse_stock: number;
  min_stock: number;
  sku: string;
  image_url: string | null;
  total_sold: number;
  created_by?: string | null;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  document: string | null;
  name: string;
  phone: string;
  address: string;
  email: string;
  notes: string;
  total_bought: number;
  created_by?: string | null;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export type PaymentMethod = 'Efectivo' | 'Transferencia' | 'Crédito';
export type SaleStatus = 'completada' | 'pendiente' | 'pagada' | 'cancelada';

export interface SaleItem {
  id?: string;
  sale_id?: string;
  product_id: string;
  product_name_snapshot: string;
  sku_snapshot: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  subtotal: number;
  created_at?: string;
}

export interface Sale {
  id: string;
  sale_number: string;
  client_id: string | null;
  created_by?: string | null;
  client_name_snapshot: string;
  client_document_snapshot: string;
  subtotal: number;
  discount: number;
  base_total: number;
  interest_rate: number;
  interest_amount: number;
  total: number;
  paid_amount: number;
  payment_method: PaymentMethod;
  status: SaleStatus;
  notes?: string;
  items?: SaleItem[];
  created_at: string;
  updated_at: string;
}

export type DebtStatus = 'pendiente' | 'vencida' | 'pagada' | 'cancelada';

export interface DebtPayment {
  id: string;
  debt_id: string;
  amount: number;
  payment_method: string;
  note: string;
  received_by?: string | null;
  created_at: string;
}

export interface Debt {
  id: string;
  sale_id: string;
  client_id: string | null;
  client_name_snapshot: string;
  client_document_snapshot: string;
  total_amount: number;
  base_total: number;
  interest_rate: number;
  interest_amount: number;
  paid_amount: number;
  balance: number;
  due_date: string;
  status: DebtStatus;
  payments?: DebtPayment[];
  created_at: string;
  updated_at: string;
}

export type PendingSaleStatus = 'PENDIENTE' | 'CONFIRMADA' | 'CANCELADA';

export interface PendingSale {
  id: string;
  pending_number: string;
  created_by?: string | null;
  client_id: string | null;
  client_name_snapshot: string;
  client_document_snapshot: string;
  items: any[];
  subtotal: number;
  discount: number;
  total: number;
  payment_method: PaymentMethod;
  notes: string;
  status: PendingSaleStatus;
  created_at: string;
  updated_at: string;
}

export interface InventoryMovement {
  id: string;
  product_id: string;
  movement_type: 'VENTA' | 'AJUSTE' | 'TRASLADO' | 'DEVOLUCION' | 'CANCELACION_VENTA';
  source_location?: 'TIENDA' | 'BODEGA' | 'PROVEEDOR' | 'EXTERNO';
  destination_location?: 'TIENDA' | 'BODEGA' | 'CLIENTE' | 'MERMA' | 'EXTERNO';
  quantity: number;
  reference_type?: string;
  reference_id?: string;
  notes?: string;
  created_by?: string | null;
  created_at: string;
}
