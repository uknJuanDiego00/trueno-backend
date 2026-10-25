// =====================================================================
// TRUENO 219 - Zod Validation Schemas
// =====================================================================

import { z } from 'zod';

// ============ AUTH SCHEMAS ============
export const LoginSchema = z.object({
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres')
});

export const RegisterSchema = z.object({
  full_name: z.string().min(2, 'El nombre completo debe tener al menos 2 caracteres'),
  email: z.string().email('Correo electrónico inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  role: z.enum(['admin', 'empleado']).optional().default('empleado')
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Correo electrónico inválido')
});

export const UpdateUserSchema = z.object({
  full_name: z.string().min(2).optional(),
  role: z.enum(['admin', 'empleado']).optional(),
  is_active: z.boolean().optional()
});

// ============ PRODUCT SCHEMAS ============
export const CreateProductSchema = z.object({
  name: z.string().min(1, 'El nombre del producto es obligatorio'),
  category: z.string().min(1, 'La categoría es obligatoria'),
  description: z.string().optional().default(''),
  buy_price: z.number().min(0, 'El precio de compra no puede ser negativo'),
  sell_price: z.number().min(0, 'El precio de venta no puede ser negativo'),
  stock: z.number().int().min(0, 'El stock en tienda no puede ser negativo').default(0),
  warehouse_stock: z.number().int().min(0, 'El stock en bodega no puede ser negativo').default(0),
  min_stock: z.number().int().min(0, 'El stock mínimo no puede ser negativo').default(5),
  sku: z.string().min(1, 'El SKU es obligatorio'),
  image_url: z.string().nullable().optional()
});

export const UpdateProductSchema = CreateProductSchema.partial();

export const AdjustStockSchema = z.object({
  delta: z.number().int('El ajuste debe ser un número entero'),
  location: z.enum(['store', 'warehouse']).default('store'),
  notes: z.string().optional()
});

export const TransferStockSchema = z.object({
  from: z.enum(['store', 'warehouse']),
  to: z.enum(['store', 'warehouse']),
  quantity: z.number().int().positive('La cantidad debe ser mayor a 0'),
  notes: z.string().optional()
}).refine(data => data.from !== data.to, {
  message: 'El origen y el destino no pueden ser iguales',
  path: ['to']
});

// ============ CLIENT SCHEMAS ============
export const CreateClientSchema = z.object({
  document: z.string().optional().default(''),
  name: z.string().min(1, 'El nombre del cliente es obligatorio'),
  phone: z.string().optional().default(''),
  address: z.string().optional().default(''),
  email: z.string().email('Correo inválido').optional().or(z.literal('')).default(''),
  notes: z.string().optional().default('')
});

export const UpdateClientSchema = CreateClientSchema.partial();

// ============ SALE SCHEMAS ============
export const SaleItemSchema = z.object({
  productId: z.string().uuid('ID de producto inválido'),
  name: z.string().optional(),
  sku: z.string().optional(),
  qty: z.number().int().positive('La cantidad debe ser mayor a 0'),
  price: z.number().min(0, 'El precio no puede ser negativo').optional(),
  cost: z.number().min(0).optional()
});

export const CreateSaleSchema = z.object({
  clientId: z.string().uuid('ID de cliente inválido').nullable().optional(),
  clientName: z.string().optional().default('Cliente General'),
  clientDocument: z.string().optional().default(''),
  paymentMethod: z.enum(['Efectivo', 'Transferencia', 'Crédito']),
  discount: z.number().min(0, 'El descuento no puede ser negativo').default(0),
  interestRate: z.number().min(0).max(100, 'El interés no puede superar el 100%').default(0),
  paid: z.number().min(0, 'El abono no puede ser negativo').optional(),
  notes: z.string().optional().default(''),
  items: z.array(SaleItemSchema).min(1, 'El carrito debe contener al menos un producto')
});

export const CancelSaleSchema = z.object({
  reason: z.string().min(3, 'Debe especificar el motivo de la cancelación')
});

// ============ DEBT PAYMENT SCHEMAS ============
export const CreateDebtPaymentSchema = z.object({
  amount: z.number().positive('El monto del abono debe ser mayor a 0'),
  paymentMethod: z.string().optional().default('Efectivo'),
  note: z.string().optional().default('')
});

// ============ PENDING SALE SCHEMAS ============
export const CreatePendingSaleSchema = z.object({
  clientId: z.string().uuid().nullable().optional(),
  clientName: z.string().optional().default('Cliente General'),
  clientDocument: z.string().optional().default(''),
  items: z.array(z.any()).min(1, 'Debe contener al menos un producto'),
  discount: z.number().min(0).default(0),
  paymentMethod: z.enum(['Efectivo', 'Transferencia', 'Crédito']).default('Efectivo'),
  notes: z.string().optional().default('')
});

export const ConfirmPendingSaleSchema = z.object({
  paymentMethod: z.enum(['Efectivo', 'Transferencia', 'Crédito']).optional(),
  paid: z.number().min(0).optional()
});

// ============ SETTINGS SCHEMA ============
export const UpdateStoreSettingsSchema = z.object({
  store_name: z.string().min(1).optional(),
  low_stock_threshold: z.number().int().min(0).optional(),
  currency: z.string().min(1).optional(),
  tax_rate: z.number().min(0).optional()
});
