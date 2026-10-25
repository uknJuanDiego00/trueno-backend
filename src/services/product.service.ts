// =====================================================================
// TRUENO 219 - Product Service
// =====================================================================

import { ProductRepository } from '@/repositories/product.repository';
import { supabaseAdmin } from '@/lib/supabase/client';
import { Product } from '@/types';

export class ProductService {
  static async listProducts(params?: {
    search?: string;
    category?: string;
    lowStock?: boolean;
    page?: number;
    limit?: number;
  }) {
    return await ProductRepository.findAll(params);
  }

  static async getProductById(id: string): Promise<Product> {
    const product = await ProductRepository.findById(id);
    if (!product) {
      const err: any = new Error('Producto no encontrado');
      err.status = 404;
      throw err;
    }
    return product;
  }

  static async createProduct(productData: Partial<Product>, userId?: string): Promise<Product> {
    // Validate unique SKU
    if (productData.sku) {
      const existing = await ProductRepository.findBySku(productData.sku);
      if (existing) {
        const err: any = new Error(`Ya existe un producto con el SKU "${productData.sku}"`);
        err.status = 409;
        throw err;
      }
    }

    return await ProductRepository.create({
      ...productData,
      created_by: userId || null
    });
  }

  static async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    await this.getProductById(id);

    // If updating SKU, check if another product uses it
    if (updates.sku) {
      const existing = await ProductRepository.findBySku(updates.sku);
      if (existing && existing.id !== id) {
        const err: any = new Error(`El SKU "${updates.sku}" ya está en uso por otro producto`);
        err.status = 409;
        throw err;
      }
    }

    return await ProductRepository.update(id, updates);
  }

  static async deleteProduct(id: string): Promise<void> {
    await this.getProductById(id);
    await ProductRepository.softDelete(id);
  }

  static async adjustStock(params: {
    id: string;
    delta: number;
    location: 'store' | 'warehouse';
    notes?: string;
    userId: string;
  }) {
    const product = await this.getProductById(params.id);
    const field = params.location === 'store' ? 'stock' : 'warehouse_stock';
    const currentVal = product[field];
    const newVal = currentVal + params.delta;

    if (newVal < 0) {
      throw new Error(`El ajuste daría como resultado un stock negativo (${newVal}) en ${params.location === 'store' ? 'tienda' : 'bodega'}`);
    }

    const updated = await ProductRepository.update(params.id, {
      [field]: newVal
    });

    // Record movement
    await supabaseAdmin.from('inventory_movements').insert({
      product_id: params.id,
      movement_type: 'AJUSTE',
      source_location: params.delta < 0 ? (params.location === 'store' ? 'TIENDA' : 'BODEGA') : 'EXTERNO',
      destination_location: params.delta > 0 ? (params.location === 'store' ? 'TIENDA' : 'BODEGA') : 'MERMA',
      quantity: Math.abs(params.delta),
      reference_type: 'MANUAL_ADJUST',
      reference_id: params.id,
      notes: params.notes || `Ajuste manual de ${params.delta} unidades`,
      created_by: params.userId
    });

    return updated;
  }

  static async transferStock(params: {
    id: string;
    from: 'store' | 'warehouse';
    to: 'store' | 'warehouse';
    quantity: number;
    userId: string;
    notes?: string;
  }) {
    return await ProductRepository.transferStockAtomic({
      productId: params.id,
      from: params.from,
      to: params.to,
      quantity: params.quantity,
      userId: params.userId,
      notes: params.notes
    });
  }

  static async getLowStockProducts() {
    return await ProductRepository.findAll({ lowStock: true, limit: 100 });
  }
}
