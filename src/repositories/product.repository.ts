// =====================================================================
// TRUENO 219 - Product Repository
// =====================================================================

import { supabaseAdmin } from '@/lib/supabase/client';
import { Product } from '@/types';

export class ProductRepository {
  static async findAll(params?: {
    search?: string;
    category?: string;
    lowStock?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = params?.page || 1;
    const limit = params?.limit || 50;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('products')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order('name', { ascending: true })
      .range(offset, offset + limit - 1);

    if (params?.search) {
      query = query.or(`name.ilike.%${params.search}%,sku.ilike.%${params.search}%,category.ilike.%${params.search}%`);
    }

    if (params?.category) {
      query = query.eq('category', params.category);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    let results = (data || []) as Product[];

    if (params?.lowStock) {
      results = results.filter(p => p.stock <= p.min_stock);
    }

    return {
      products: results,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    };
  }

  static async findById(id: string): Promise<Product | null> {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) throw error;
    return data as Product | null;
  }

  static async findBySku(sku: string): Promise<Product | null> {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('sku', sku)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) throw error;
    return data as Product | null;
  }

  static async create(productData: Partial<Product>): Promise<Product> {
    const { data, error } = await supabaseAdmin
      .from('products')
      .insert(productData)
      .select('*')
      .single();

    if (error) throw error;
    return data as Product;
  }

  static async update(id: string, productData: Partial<Product>): Promise<Product> {
    const { data, error } = await supabaseAdmin
      .from('products')
      .update({ ...productData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data as Product;
  }

  static async softDelete(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('products')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }

  static async transferStockAtomic(params: {
    productId: string;
    from: 'store' | 'warehouse';
    to: 'store' | 'warehouse';
    quantity: number;
    userId: string;
    notes?: string;
  }) {
    const { data, error } = await supabaseAdmin.rpc('transfer_stock_atomic', {
      p_product_id: params.productId,
      p_from_location: params.from,
      p_to_location: params.to,
      p_quantity: params.quantity,
      p_user_id: params.userId,
      p_notes: params.notes || ''
    });

    if (error) throw error;
    return data;
  }
}
