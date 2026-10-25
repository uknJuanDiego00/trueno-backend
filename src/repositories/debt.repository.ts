// =====================================================================
// TRUENO 219 - Debt Repository
// =====================================================================

import { supabaseAdmin } from '@/lib/supabase/client';
import { Debt, DebtPayment } from '@/types';

export class DebtRepository {
  static async findAll(params?: {
    clientId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const page = params?.page || 1;
    const limit = params?.limit || 50;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('debts')
      .select('*, debt_payments(*)', { count: 'exact' })
      .order('due_date', { ascending: true })
      .range(offset, offset + limit - 1);

    if (params?.clientId) {
      query = query.eq('client_id', params.clientId);
    }
    if (params?.status) {
      query = query.eq('status', params.status);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      debts: (data || []) as Debt[],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    };
  }

  static async findById(id: string): Promise<Debt | null> {
    const { data, error } = await supabaseAdmin
      .from('debts')
      .select('*, debt_payments(*)')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as Debt | null;
  }

  static async getPaymentsByDebtId(debtId: string): Promise<DebtPayment[]> {
    const { data, error } = await supabaseAdmin
      .from('debt_payments')
      .select('*')
      .eq('debt_id', debtId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as DebtPayment[];
  }

  static async addPaymentAtomic(params: {
    debtId: string;
    amount: number;
    paymentMethod: string;
    note?: string;
    receivedBy: string;
  }) {
    const { data, error } = await supabaseAdmin.rpc('register_debt_payment_atomic', {
      p_debt_id: params.debtId,
      p_amount: params.amount,
      p_payment_method: params.paymentMethod || 'Efectivo',
      p_note: params.note || '',
      p_received_by: params.receivedBy
    });

    if (error) throw error;
    return data;
  }

  static async getSummary() {
    const { data, error } = await supabaseAdmin
      .from('debts')
      .select('status, balance, total_amount, paid_amount');

    if (error) throw error;

    const list = data || [];
    const totalPending = list
      .filter(d => d.status !== 'pagada' && d.status !== 'cancelada')
      .reduce((sum, d) => sum + Number(d.balance || 0), 0);

    const overdueCount = list.filter(d => d.status === 'vencida').length;
    const pendingCount = list.filter(d => d.status === 'pendiente').length;
    const paidCount = list.filter(d => d.status === 'pagada').length;

    return {
      totalPendingBalance: totalPending,
      pendingCount,
      overdueCount,
      paidCount,
      totalDebts: list.length
    };
  }
}
