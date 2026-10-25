// =====================================================================
// TRUENO 219 - Pending Sale Repository
// =====================================================================

import { supabaseAdmin } from '@/lib/supabase/client';
import { PendingSale } from '@/types';

export class PendingSaleRepository {
  static async findAll(params?: { status?: string }) {
    let query = supabaseAdmin
      .from('pending_sales')
      .select('*')
      .order('created_at', { ascending: false });

    if (params?.status) {
      query = query.eq('status', params.status);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as PendingSale[];
  }

  static async findById(id: string): Promise<PendingSale | null> {
    const { data, error } = await supabaseAdmin
      .from('pending_sales')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as PendingSale | null;
  }

  static async create(pendingData: Partial<PendingSale>): Promise<PendingSale> {
    const { data, error } = await supabaseAdmin
      .from('pending_sales')
      .insert(pendingData)
      .select('*')
      .single();

    if (error) throw error;
    return data as PendingSale;
  }

  static async update(id: string, pendingData: Partial<PendingSale>): Promise<PendingSale> {
    const { data, error } = await supabaseAdmin
      .from('pending_sales')
      .update({ ...pendingData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data as PendingSale;
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from('pending_sales')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  static async confirmAtomic(params: {
    pendingId: string;
    saleNumber: string;
    paymentMethod: string;
    paidAmount: number;
    userId: string;
  }) {
    const { data, error } = await supabaseAdmin.rpc('confirm_pending_sale_atomic', {
      p_pending_id: params.pendingId,
      p_sale_number: params.saleNumber,
      p_payment_method: params.paymentMethod,
      p_paid_amount: params.paidAmount,
      p_user_id: params.userId
    });

    if (error) throw error;
    return data;
  }
}
