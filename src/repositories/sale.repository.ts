// =====================================================================
// TRUENO 219 - Sale Repository
// =====================================================================

import { supabaseAdmin } from '@/lib/supabase/client';
import { Sale } from '@/types';

export class SaleRepository {
  static async findAll(params?: {
    clientId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params?.page || 1;
    const limit = params?.limit || 50;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('sales')
      .select('*, sale_items(*)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (params?.clientId) {
      query = query.eq('client_id', params.clientId);
    }
    if (params?.status) {
      query = query.eq('status', params.status);
    }
    if (params?.dateFrom) {
      query = query.gte('created_at', params.dateFrom);
    }
    if (params?.dateTo) {
      query = query.lte('created_at', params.dateTo);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      sales: (data || []) as Sale[],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    };
  }

  static async findById(id: string): Promise<Sale | null> {
    const { data, error } = await supabaseAdmin
      .from('sales')
      .select('*, sale_items(*), debts(*)')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as Sale | null;
  }

  static async registerSaleAtomic(params: {
    saleNumber: string;
    clientId: string | null;
    clientName: string;
    clientDocument: string;
    paymentMethod: string;
    discount: number;
    interestRate: number;
    paidAmount: number;
    items: any[];
    notes?: string;
    createdBy: string;
  }) {
    const { data, error } = await supabaseAdmin.rpc('register_sale_atomic', {
      p_sale_number: params.saleNumber,
      p_client_id: params.clientId,
      p_client_name: params.clientName,
      p_client_document: params.clientDocument,
      p_payment_method: params.paymentMethod,
      p_discount: params.discount,
      p_interest_rate: params.interestRate,
      p_paid_amount: params.paidAmount,
      p_items: params.items,
      p_notes: params.notes || '',
      p_created_by: params.createdBy
    });

    if (error) throw error;
    return data;
  }

  static async cancelSaleAtomic(saleId: string, userId: string, reason: string) {
    const { data, error } = await supabaseAdmin.rpc('cancel_sale_atomic', {
      p_sale_id: saleId,
      p_user_id: userId,
      p_reason: reason
    });

    if (error) throw error;
    return data;
  }
}
